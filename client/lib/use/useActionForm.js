/**
 * @module use/useActionForm
 * @description Provides submit, cancel, and dry-run logic for action forms. Handles
 * validation gating, error display, and success/error callbacks. ActionForm uses this
 * internally; callers that want the behaviour without the shell can use it directly.
 */
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import { defaultOnSubmissionError, defaultOnSubmitNotAnyModified } from "@vueda/use/useObjectForm.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { computed, nextTick, onDeactivated, onUnmounted, reactive, watch } from "vue";
import { toast } from "vue-sonner";

/**
 * @typedef {object} ActionFormProps
 * @property {(options: { formValues: object, dryRun: boolean }) => Promise<any>} [runAction] - Executes the action.
 * @property {string} [actionSuccessSummary] - Toast text on success.
 * @property {string} [actionErrorSummary] - Toast text on failure.
 * @property {{ errored: boolean, error: Error|null, loading: boolean|undefined }} [fetchState] - Data-fetch status.
 * @property {{ errored: boolean, error: Error|null, loading: boolean|undefined }} [actionState] - Action execution status.
 * @property {boolean} [hasInput] - Whether the form has input fields that must be validated before submission.
 * @property {(reason: "success"|"cancel") => Promise<void>} [redirectTo] - Called after success or cancel.
 * @property {(response: any) => void} [onSubmissionSuccessHandler] - Replaces the default success toast and redirect.
 * @property {(args: { error: Error, formContext: import('@vueda/use/useForm.js').FormContext, toast: any }) => Promise<boolean>} [onSubmissionErrorHandler] - Replaces the default error toast.
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
 * @property {(dryRun?: boolean) => Promise<void>} handleConfirm - Validates and submits the form.
 * @property {(e?: Event) => Promise<void>} handleCancelClick - Cancels and redirects.
 */

/**
 * Provides submit, cancel, and dry-run behaviour for action forms. Pass the injected
 * form context and a reactive props-compatible object. `ActionForm` calls this internally;
 * use it directly when you want the logic without the `ActionForm` shell.
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

    const combinedError = computed(() => props.fetchState.error || localActionState.error);
    const combinedErrored = computed(() => !!combinedError.value);
    const combinedLoading = computed(() => loadingCombine(props.fetchState.loading, localActionState.loading));

    let actionPromise = null;

    const handleError = async (error, dryRun) => {
        if (dryRun) {
            if (error instanceof FormValidationError) {
                formContext.handleServerFormValidationError(error);
            }
            return;
        }
        const errorHandler = props.onSubmissionErrorHandler || defaultOnSubmissionError;
        const handled = await errorHandler({ error, formContext, toast });
        if (!handled) {
            localActionState.errored = true;
            localActionState.error = error;
            toast.error(props.actionErrorSummary || "Action Failed", {
                description: localActionState.error,
                duration: 15000,
            });
        }
    };

    const handleConfirm = async (dryRun = false) => {
        formContext.setAllTouched();
        localActionState.loading = true;
        if (props.hasInput && !dryRun) {
            await nextTick();
            if (!formContext.state.anyModified) {
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
            actionPromise = props.runAction({
                formValues: formContext.state.submittingValues,
                dryRun,
            });
            const response = await actionPromise;
            if (props.actionState.errored) {
                await handleError(props.actionState.error, dryRun);
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
            await handleError(error, dryRun);
        } finally {
            actionPromise = null;
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

    return { combinedError, combinedErrored, combinedLoading, handleConfirm, handleCancelClick };
}
