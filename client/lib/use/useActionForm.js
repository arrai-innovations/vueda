/**
 * @module use/useActionForm
 * @description Provides submit, cancel, and dry-run logic for action forms. Handles
 * validation gating, error display, warning confirmation (HTTP 409 confirm-then-run), and
 * success/error callbacks. ActionForm uses this internally; callers that want the behaviour
 * without the shell can use it directly.
 */
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import { useConfirmationController } from "@vueda/use/useConfirmationController.js";
import {
    defaultOnSubmissionWarningsRequireConfirmation,
    defaultOnSubmitNotAnyModified,
} from "@vueda/use/useObjectForm.js";
import { ConfirmationRequiredError, FormValidationError } from "@vueda/utils/errors.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { computed, nextTick, onDeactivated, onUnmounted, reactive, watch } from "vue";
import { toast } from "vue-sonner";

/**
 * @typedef {object} ActionFormProps
 * @property {(options: { formValues: object, dryRun: boolean, acknowledgeWarnings?: string }) => Promise<any>} [runAction] - Executes
 *  the action. `acknowledgeWarnings` carries the warnings digest of a confirmed retry; implementations should forward
 *  it as the `Acknowledge-Warnings` header (see `ModelActionForm`'s `defaultRunAction`).
 * @property {string} [actionSuccessSummary] - Toast text on success.
 * @property {string} [actionErrorSummary] - Toast text on failure.
 * @property {{ errored: boolean, error: Error|null, loading: boolean|undefined }} [fetchState] - Data-fetch status.
 * @property {{ errored: boolean, error: Error|null, loading: boolean|undefined }} [actionState] - Action execution status.
 * @property {boolean} [hasInput] - Whether the form has input fields that must be validated before submission.
 * @property {boolean} [requireModified] - When `false`, skips the "no changes detected" guard. Defaults to `true`. Set to `false` for forms that start empty (sign-in, forgot-password) where modification is not a meaningful concept.
 * @property {(reason: "success"|"cancel") => Promise<void>} [redirectTo] - Called after success or cancel.
 * @property {(response: any) => void} [onSubmissionSuccessHandler] - Replaces the default success toast and redirect.
 * @property {(args: { error: Error, formContext: import('@vueda/use/useForm.js').FormContext, toast: any }) => Promise<boolean>} [onSubmissionErrorHandler] - Replaces the default error toast.
 * @property {(options: {
 *     error: import('@vueda/utils/errors.js').ConfirmationRequiredError,
 *     formContext: import('@vueda/use/useForm.js').FormContext,
 *     confirmation: import('@vueda/use/useConfirmationController.js').ConfirmationController,
 *     toast: import("vue-sonner").toast
 * }) => Promise<boolean>} [onSubmissionWarningsRequireConfirmation] - Replaces the default handling of a
 *  confirmation-required response (HTTP 409): render the warnings and ask the user via the confirmation
 *  controller. Resolving `true` retries the action once with the warnings acknowledged.
 * @property {boolean} [readyToDryRun] - When true, triggers a dry-run validation pass.
 */

/**
 * @typedef {object} ActionFormRawState
 * @property {boolean} loading - Whether the action is in flight.
 * @property {boolean} errored - Whether the last action errored.
 * @property {Error|null} error - The error from the last action, if any.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ActionFormRawState>} ActionFormState
 */

/**
 * @typedef {object} ActionFormContext
 * @property {import('vue').ComputedRef<Error|null>} combinedError - Fetch or action error, whichever is present.
 * @property {import('vue').ComputedRef<boolean>} combinedErrored - Whether any error is present.
 * @property {import('vue').ComputedRef<boolean|undefined>} combinedLoading - Combined fetch and action loading state.
 * @property {import('@vueda/use/useConfirmationController.js').ConfirmationController} confirmation - Controller for
 *  the warning confirmation dialog (`ActionForm` binds a `FormConfirmDialog` to it; standalone callers must mount
 *  one, or warned submissions are cancelled).
 * @property {(dryRun?: boolean) => Promise<void>} handleConfirm - Validates and submits the form.
 * @property {(e?: Event) => Promise<void>} handleCancelClick - Cancels and redirects.
 */

/**
 * Provides submit, cancel, and dry-run behaviour for action forms. Pass the injected
 * form context and a reactive props-compatible object. `ActionForm` calls this internally;
 * use it directly when you want the logic without the `ActionForm` shell.
 *
 * When the server gates the action behind warning acknowledgement (HTTP 409, surfaced as a
 * `ConfirmationRequiredError` with a digest), the returned `confirmation` controller prompts the
 * user and a confirmed action is retried once with the digest acknowledged. `ActionForm` mounts
 * the `FormConfirmDialog` bound to the controller; standalone callers must render one (or register
 * a custom consumer), otherwise warned submissions fail closed as cancelled.
 *
 * @param {import('@vueda/use/useForm.js').FormContext} formContext - The form context providing validation state.
 * @param {import('vue').UnwrapNestedRefs<ActionFormProps>} props - Reactive action form configuration.
 * @returns {ActionFormContext}
 */
export function useActionForm(formContext, props) {
    /** @type {ActionFormState} */
    const localActionState = reactive({
        loading: false,
        errored: false,
        error: null,
    });

    const combinedError = computed(() => props.fetchState?.error || localActionState.error);
    const combinedErrored = computed(() => !!combinedError.value);
    const combinedLoading = computed(() => loadingCombine(props.fetchState?.loading, localActionState.loading));

    let actionPromise = null;

    const confirmation = useConfirmationController({
        noConsumerWarning:
            "useActionForm: an action returned warnings that require confirmation, but no dialog is bound " +
            "to the confirmation controller; treating it as cancelled. ActionForm mounts FormConfirmDialog " +
            "itself; when using useActionForm standalone, render " +
            '<FormConfirmDialog :controller="actionForm.confirmation" /> (or register a custom consumer via ' +
            "confirmation.register()) so the action can be confirmed.",
    });

    const handleError = async (error, dryRun) => {
        if (error instanceof FormValidationError) {
            formContext.handleServerFormValidationError(error);
            return;
        }
        if (dryRun) return;
        if (props.onSubmissionErrorHandler) {
            const handled = await props.onSubmissionErrorHandler({ error, formContext, toast });
            if (handled) return;
        }
        localActionState.errored = true;
        localActionState.error = error;
        toast.error(props.actionErrorSummary || "Action Failed", {
            description: localActionState.error,
            duration: 15000,
        });
    };

    // Routes a failed attempt. A ConfirmationRequiredError (server 409: valid but unacknowledged
    // warnings) asks the confirmation hook and, if the user confirms, retries once with the warnings
    // digest acknowledged. A changed warning set yields a new digest and re-prompts, so this
    // terminates on either a clean run, a real error, or a cancel. The confirmation flow never runs
    // during the dry-run pre-flight (a pre-flight 409 is dropped by handleError's dry-run
    // early-return), and a 409 without a digest falls through to normal error handling, since
    // retrying without the acknowledgement header would just be gated again, forever.
    const handleActionError = async (error, runArgs, dryRun) => {
        if (!dryRun && error instanceof ConfirmationRequiredError && error.digest != null) {
            const onWarningsRequireConfirmation =
                props.onSubmissionWarningsRequireConfirmation || defaultOnSubmissionWarningsRequireConfirmation;
            const confirmed = await onWarningsRequireConfirmation({ error, formContext, confirmation, toast });
            if (confirmed) {
                await performAction({ ...runArgs, acknowledgeWarnings: error.digest }, dryRun);
            } else {
                // Cancelled: the action did not run, but it is not a failure to report. Flag errored
                // (the analogue of useObjectForm's submitErrored) without an error, so no failure
                // banner or toast renders and no redirect fires.
                localActionState.errored = true;
            }
            return;
        }
        await handleError(error, dryRun);
    };

    // Performs one action attempt and routes the outcome; handleActionError recurses back into this
    // for a confirmed retry.
    const performAction = async (runArgs, dryRun) => {
        try {
            actionPromise = props.runAction(runArgs);
            const response = await actionPromise;
            if (props.actionState?.errored) {
                await handleActionError(props.actionState.error, runArgs, dryRun);
                return;
            }
            if (dryRun) {
                return;
            }
            if (props.onSubmissionSuccessHandler) {
                props.onSubmissionSuccessHandler(response);
            } else {
                toast.success(props.actionSuccessSummary || "Action Succeeded", {
                    duration: 15000,
                });
                if (props.redirectTo) {
                    await props.redirectTo("success");
                }
            }
        } catch (error) {
            await handleActionError(error, runArgs, dryRun);
        } finally {
            actionPromise = null;
        }
    };

    const handleConfirm = async (dryRun = false) => {
        formContext.setAllTouched();
        localActionState.loading = true;
        if (props.hasInput && !dryRun) {
            await nextTick();
            if (props.requireModified !== false && !formContext.state.anyModified) {
                await defaultOnSubmitNotAnyModified({ toast });
                localActionState.loading = false;
                return;
            }
            if (formContext.state.anyError) {
                const nonServerErrors = Object.entries(formContext.state.errors)
                    .map(([key, value]) => [key, omit(value, "server")])
                    .filter(([, value]) => !isEmpty(value));
                if (nonServerErrors.length) {
                    const plural = nonServerErrors.length > 1;
                    toast.warning("Submission Blocked", {
                        description: `Please correct the highlighted error${plural ? "s" : ""}.`,
                        duration: 10000,
                    });
                    localActionState.loading = false;
                    return;
                }
            }
        }

        localActionState.errored = false;
        localActionState.error = null;
        try {
            await performAction({ formValues: formContext.state.submittingValues, dryRun }, dryRun);
        } finally {
            localActionState.loading = false;
        }
    };

    const handleCancelClick = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (props.redirectTo) {
            await props.redirectTo("cancel");
        }
    };

    onDeactivated(() => {
        actionPromise?.cancel?.();
    });
    onUnmounted(() => {
        actionPromise?.cancel?.();
    });

    watch(
        () => props.readyToDryRun,
        async (newVal) => {
            if (newVal) {
                await handleConfirm(true);
            }
        },
    );

    return { combinedError, combinedErrored, combinedLoading, confirmation, handleConfirm, handleCancelClick };
}
