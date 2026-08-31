/**
 * @module use/useObjectForm
 * @description Bridges a generic form context with an object instance, handling submission, redirection, and unsaved-change warnings.
 */
import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import { toast } from "@arrai-innovations/vue-sonner";
import { useConfirmationController } from "@vueda/use/useConfirmationController.js";
import { useLeaveUnload } from "@vueda/use/useLeaveUnload.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { ConfirmationRequiredError, FormValidationError } from "@vueda/utils/errors.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { computed, nextTick, reactive } from "vue";
import { useRouter } from "vue-router";

/**
 * @typedef {object} ObjectFormRawProps
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string} verboseName - The verbose name of the model.
 * @property {'list'|'update'|'read'|null} redirectAfter - The view/route to redirect to after creating the object.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ObjectFormRawProps>} ObjectFormProps
 */

/**
 * @typedef {object} ObjectFormRawState
 * @property {boolean|undefined} loading - Whether the object form is submitting. Does not include object loading.
 * @property {Error|null} error - The error that occurred.
 * @property {boolean} errored - Whether an error occurred.
 * @property {boolean} submitErrored - Whether an error occurred, regardless of it being handled or not.
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string} verboseName - The verbose name of the model.
 * @property {boolean} modified - Whether the form has changes from the initial values.
 * @property {string} firstErrorField - The name of the first field with an error.
 * @property {'list'|'update'|'read'|null} redirectAfter - The view/route to redirect to after creating the object.
 * @property {string} pkKey - The primary key field name.
 * @property {string} pk - The primary key value.
 * @property {object} object - The object being edited.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ObjectFormRawState>} ObjectFormState
 */

/**
 * Type for handling when there are no changes detected upon submission attempt.
 * @typedef {(options: {
 *     formContext: FormContext,
 *     toast: import("@arrai-innovations/vue-sonner").toast
 * }) => Promise<boolean>} OnSubmitNotAnyModified
 */

/**
 * Type for handling submission when form errors are present.
 * @typedef {(options: {
 *     formContext: FormContext,
 *     toast: import("@arrai-innovations/vue-sonner").toast
 * }) => Promise<boolean>} OnSubmitAnyError
 */

/**
 * Type for handling errors during form submission.
 * @typedef {(options: {
 *     error: Error,
 *     formContext: FormContext,
 *     toast: import("@arrai-innovations/vue-sonner").toast,
 *     isUpdate: boolean,
 *     state: ObjectFormState
 * }) => Promise<Boolean>} OnSubmissionError
 */

/**
 * Type for handling successful form submission.
 * @typedef {(options: {
 *     isUpdate: boolean,
 *     state: ObjectFormState,
 *     toast: import("@arrai-innovations/vue-sonner").toast,
 *     router: import("vue-router").Router,
 *     formContext: FormContext
 * }) => Promise<void>} OnSubmissionSuccess
 */

/**
 * Default implementation for onSubmitNotAnyModified hook.
 *
 * @param {object} options
 * @param {import("@arrai-innovations/vue-sonner").toast} options.toast
 * @returns {Promise<boolean>} True if the submission should be stopped.
 */
export const defaultOnSubmitNotAnyModified = async ({ toast }) => {
    toast.info("No Changes Detected", {
        description: "Please modify the fields before submitting.",
        duration: 15000,
    });
    return true;
};

/**
 * Default implementation for onSubmitAnyError hook.
 *
 * @param {object} options
 * @param {import("@arrai-innovations/vue-sonner").toast} options.toast
 * @param {FormContext} options.formContext
 * @returns {Promise<boolean>} True if the submission should be stopped.
 */
export const defaultOnSubmitAnyError = async ({ state, formContext, toast }) => {
    let ignoredFields = [];
    if (formContext.state.anyIgnored) {
        ignoredFields = Object.entries(formContext.state.ignored)
            .filter(([, value]) => value === true)
            .map(([key]) => key);
    }
    const errors = Object.entries(formContext.state.errors).filter(
        ([key]) => !ignoredFields.some((ignored) => key === ignored || key.startsWith(`${ignored}.`)),
    );

    const nonServerErrors = errors
        .map(([key, value]) => [key, omit(value, "server")])
        .filter(([, value]) => !isEmpty(value));
    // if there are server errors, they should disappear on blur of that field.
    // if there are server messages on one field related to multiple, you might resolve the issue by
    //  changing a difference field.
    // let them recheck with the server if only server validation errors exist.
    if (nonServerErrors.length) {
        const plural = nonServerErrors.length > 1;
        // no submission if there are errors
        toast.warning("Pre-save Validation Failed", {
            description: `Please correct the error${plural ? "s" : ""} indicated.`,
            duration: 15000,
        });
        const elementsByName = document.getElementsByName(state.firstErrorField);
        if (elementsByName.length) {
            const el = elementsByName[0];
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return true;
    }
    return false;
};

/**
 * Default implementation for onSubmissionError hook.
 *
 * @param {object} options
 * @param {ObjectFormState} options.state - The form state.
 * @param {Error} options.error - The error that occurred.
 * @param {FormContext} options.formContext - The form context.
 * @param {import("@arrai-innovations/vue-sonner").toast} options.toast - The toast service.
 * @returns {Promise<boolean>} - True if the error should be marked as handled. Otherwise it may be displayed.
 */
export const defaultOnSubmissionError = async ({ state, error, formContext, toast }) => {
    if (error instanceof FormValidationError) {
        formContext.handleServerFormValidationError(error);
        const plural = Object.keys(error.errors).length > 1;
        toast.warning("Save Validation Failed", {
            description: `Please review the new error${plural ? "s" : ""} displayed. You have been scrolled to the first error.`,
            duration: 15000,
        });
        // scroll to the anchor we render for each field by path/name.
        const elementsByName = document.getElementsByName(state.firstErrorField);
        if (elementsByName.length) {
            elementsByName[0].scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return true;
    }
};

/**
 * Type for handling a submission that the server reports requires confirmation (HTTP 409): the
 * change is valid but carries unacknowledged advisory warnings.
 * @typedef {(options: {
 *     error: import('@vueda/utils/errors.js').ConfirmationRequiredError,
 *     formContext: FormContext,
 *     confirmation: import('@vueda/use/useConfirmationController.js').ConfirmationController,
 *     toast: import("@arrai-innovations/vue-sonner").toast,
 *     state: ObjectFormState
 * }) => Promise<boolean>} OnSubmissionWarningsRequireConfirmation
 */

/**
 * Default implementation for onSubmissionWarningsRequireConfirmation hook.
 *
 * Renders the server warnings into the form (as messages) so they are visible behind the dialog,
 * then opens the confirmation controller and resolves to the user's choice. Returning `true`
 * triggers a single resubmission that acknowledges the warnings; `false` leaves the form unsaved
 * with the warnings still displayed.
 *
 * @param {object} options
 * @param {import('@vueda/utils/errors.js').ConfirmationRequiredError} options.error - The 409 error.
 * @param {FormContext} options.formContext - The form context.
 * @param {import('@vueda/use/useConfirmationController.js').ConfirmationController} options.confirmation - The confirmation dialog controller.
 * @returns {Promise<boolean>} - True if the user confirmed and the save should be retried.
 */
export const defaultOnSubmissionWarningsRequireConfirmation = async ({ error, formContext, confirmation }) => {
    // Clear the previous round's warnings (the controller still holds them) before rendering the new
    // set, so a re-prompt with a changed warning set does not leave stale messages on fields that are
    // no longer warned about. clearServerErrors only removes the server-coded entry, leaving any local
    // validation messages intact.
    Object.keys(confirmation.messages ?? {}).forEach((name) => formContext.clearServerErrors(name));
    formContext.handleServerFormValidationError(error);
    return await confirmation.request(error.messages, { bulk: error.bulk });
};

/**
 * Default implementation for onSubmissionSuccess hook.
 *
 * @param {object} options
 * @param {boolean} options.isUpdate - Whether it was a create or update submission.
 * @param {import("@arrai-innovations/vue-sonner").toast} options.toast - The toast service.
 * @param {import("vue-router").Router} options.router - The router.
 * @param {ObjectFormState} options.state - The form state.
 * @returns {Promise<void>}
 */
export const defaultOnSubmissionSuccess = async ({ isUpdate, state, toast, router }) => {
    const redirectAfter = state.redirectAfter;
    let detailMsg = "";
    if (redirectAfter === "update") {
        detailMsg = "Redirecting to update view.";
    } else if (redirectAfter === "read") {
        detailMsg = "Redirecting to read view.";
    } else if (redirectAfter === "list") {
        detailMsg = "Returning to the list view.";
    }

    toast.success(`${memoizedStartCase(state.verboseName)} Successfully ${isUpdate ? "Updated" : "Created"}`, {
        description: detailMsg,
        duration: 15000,
    });
    if (redirectAfter === "list") {
        await router.push({
            name: LIST_VIEW_CRUD_NAME,
            params: {
                app: state.app,
                model: state.model,
                action: "list",
            },
        });
    } else if (redirectAfter === "read") {
        await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: {
                app: state.app,
                model: state.model,
                action: "read",
                pk: state.object[state.pkKey],
            },
        });
    } else if (redirectAfter === "update") {
        await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: {
                app: state.app,
                model: state.model,
                action: "update",
                pk: state.object[state.pkKey],
            },
        });
    }
    // else, stay on the same page.
};

/**
 * @typedef {object} ObjectFormInstance
 * @property {ObjectFormState} state - The form state.
 * @property {import('@vueda/use/useConfirmationController.js').ConfirmationController} confirmation - Controller for the warning confirmation dialog.
 * @property {() => Promise<void>} submit - Submit the form.
 * @property {OnSubmitNotAnyModified} onSubmitNotAnyModified - The hook to call when the form is submitted with no changes.
 * @property {OnSubmitAnyError} onSubmitAnyError - The hook to call when the form is submitted with errors.
 * @property {OnSubmissionError} onSubmissionError - The hook to call when an error occurs during submission.
 * @property {OnSubmissionWarningsRequireConfirmation} onSubmissionWarningsRequireConfirmation - The hook to call when the server requires confirmation of warnings.
 * @property {OnSubmissionSuccess} onSubmissionSuccess - The hook to call when submission is successful
 */

/**
 * This composition function bridges the gap between the generic FormContext (useForm) and data handling ObjectInstance
 *  (useObject, useObjectInstance). It provides a submit function that handles the form submission, and the state of the
 *  form. The objectForm is `loading` when the form is submitting, `instanceObject.state.loading` is not tied in.
 *  The form will warn the user if they have unsaved changes when they try to navigate away from the page.
 *  The form will also display a toast message when the form is successfully submitted or when an error occurs.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useObjectInstance } from '@arrai-innovations/reactive-helpers';
 * import FormConfirmDialog from '@vueda/form/confirm/FormConfirmDialog.vue';
 * import { useForm } from '@vueda/use/useForm.js';
 * import { useObjectForm } from '@vueda/use/useObjectForm.js';
 * import { reactive } from 'vue';
 *
 * // Component props
 * const props = defineProps({
 *   app: String,
 *   model: String,
 * });
 *
 * // Setup form context with initial values
 * const formContext = useForm(reactive({ initialValues: { name: '', age: 0 } }));
 *
 * // Object instance for CRUD operations
 * const instanceObject = useObjectInstance({
 *   props: reactive({ id: '123', app: props.app, model: props.model }),
 *   handlers: {
 *       // CRUD handlers
 *   }
 * });
 *
 * // Object form handling
 * const objectForm = useObjectForm({ props, formContext, instanceObject });
 * </script>
 * <template>
 *   <form @submit.prevent="objectForm.submit">
 *     <input v-model="formContext.state.values.name" placeholder="Name" />
 *     <input v-model="formContext.state.values.age" placeholder="Age" type="number" />
 *     <button type="submit" :disabled="objectForm.state.loading || !formContext.state.anyModified">Submit</button>
 *   </form>
 *   <p v-if="objectForm.state.loading">Loading...</p>
 *   <p v-if="objectForm.state.error">{{ objectForm.state.error.message }}</p>
 *   <!-- Required: resolves submit-time warning confirmations (HTTP 409); without it warned saves are cancelled. -->
 *   <FormConfirmDialog :controller="objectForm.confirmation" />
 * </template>
 * ```
 *
 * You should refer to vueda's useForm example and reactive-helper's useObject/useObjectInstance examples for more
 *  detail on those individual parts.
 *
 * @param {object} options
 * @param {ObjectFormProps} options.props - The props object.
 * @param {import('./useForm.js').FormContext} options.formContext - The form context object.
 * @param {import("@arrai-innovations/reactive-helpers").ObjectInstance} options.instanceObject - The object instance.
 * @returns {ObjectFormInstance} The object form instance.
 */
export function useObjectForm({ props, formContext, instanceObject }) {
    const loadingError = useLoadingError();
    /** @type{ObjectFormState} */
    const state = reactive({
        loading: loadingError.loading,
        error: loadingError.error,
        errored: loadingError.errored,
        submitErrored: false,
        app: computed(() => props.app),
        model: computed(() => props.model),
        verboseName: computed(() => props.verboseName),
        modified: computed(() => formContext.state.anyModified),
        firstErrorField: computed(() => props.firstErrorField),
        redirectAfter: computed(() => props.redirectAfter),
        pkKey: computed(() => instanceObject.state.pkKey),
        // what we requested the pk to be, not what the server returned.
        // in success after create, state.object[state.pkKey] will have the new pk.
        pk: computed(() => instanceObject.state.pk),
        object: computed(() => instanceObject.state.object),
    });
    const confirmation = useConfirmationController({
        noConsumerWarning:
            "useObjectForm: a save returned warnings that require confirmation, but no dialog is bound " +
            "to the confirmation controller; treating it as cancelled. Render " +
            '<FormConfirmDialog :controller="objectForm.confirmation" /> in the shell (or register a ' +
            "custom consumer via confirmation.register()) so the save can be confirmed.",
    });
    const returnObject = {
        state,
        confirmation,
        submit: () => {
            // prevent multiple submission.
            if (promises.submit) {
                return promises.submit;
            }
            const submitPromise = doSubmit();
            promises.submit = submitPromise;
            return submitPromise;
        },
        onSubmitNotAnyModified: defaultOnSubmitNotAnyModified,
        onSubmitAnyError: defaultOnSubmitAnyError,
        onSubmissionError: defaultOnSubmissionError,
        onSubmissionWarningsRequireConfirmation: defaultOnSubmissionWarningsRequireConfirmation,
        onSubmissionSuccess: defaultOnSubmissionSuccess,
    };
    useLeaveUnload(state);
    const router = useRouter();
    const promises = {
        submit: null,
    };

    // Performs one create/update attempt and routes the outcome. On a ConfirmationRequiredError
    // (server 409: valid but unacknowledged warnings) it asks the confirmation hook and, if the user
    // confirms, retries once with the warnings digest acknowledged. A changed warning set yields a
    // new digest and re-prompts, so this terminates on either a clean save, a real error, or a cancel.
    const performAndHandle = async (createOrUpdate, args, isUpdate) => {
        await createOrUpdate(args);
        if (!instanceObject.state.errored) {
            await returnObject.onSubmissionSuccess({ formContext, toast, router, isUpdate, state });
            return;
        }
        const error = instanceObject.state.error;
        // Only enter the confirmation flow when we have a digest to acknowledge with. A 409 without
        // one (e.g. a project with a custom EXCEPTION_HANDLER that drops it) would otherwise retry
        // without the header, be gated again, and loop forever; fall through to the error path instead.
        if (error instanceof ConfirmationRequiredError && error.digest != null) {
            // Not a failure: clear it so a later genuine error is not masked, then ask the user.
            instanceObject.clearError();
            const confirmed = await returnObject.onSubmissionWarningsRequireConfirmation({
                error,
                formContext,
                confirmation,
                toast,
                state,
            });
            if (confirmed) {
                await performAndHandle(createOrUpdate, { ...args, acknowledgeWarnings: error.digest }, isUpdate);
            } else {
                state.submitErrored = true;
            }
            return;
        }
        state.submitErrored = true;
        const handled = await returnObject.onSubmissionError({ error, formContext, toast, isUpdate, state });
        if (handled) {
            instanceObject.clearError();
        }
        // otherwise, whatever is looking at instanceObject.state.error will handle it.
    };

    const doSubmit = async () => {
        try {
            // start 'submitting' right away, makes it useful for disabling the submit button.
            loadingError.clearError();
            loadingError.setLoading();
            state.submitErrored = false;

            // set all fields as touched to show errors
            formContext.setAllTouched();
            // wait for validation watchers to run
            await nextTick();
            if (!formContext.state.anyModified) {
                // should we stop if there is nothing changed?
                const stop = await returnObject.onSubmitNotAnyModified({ state, formContext, toast });
                if (stop) {
                    state.submitErrored = true;
                    return;
                }
            }
            if (formContext.state.anyError) {
                // should we stop for errors?
                const stop = await returnObject.onSubmitAnyError({ state, formContext, toast });
                if (stop) {
                    state.submitErrored = true;
                    return;
                }
            }
            const isUpdate = !!instanceObject.state.pk;
            const createOrUpdate = isUpdate ? instanceObject.update : instanceObject.create;
            const formValues = formContext.state.submittingValues;
            const args = {
                object: {
                    ...formValues,
                },
            };
            if (isUpdate) {
                args.id = instanceObject.state.object[instanceObject.state.pkKey];
            }
            await performAndHandle(createOrUpdate, args, isUpdate);
        } catch (e) {
            // errors here are outside the normal course for expected errors
            loadingError.setError(e);
        } finally {
            loadingError.clearLoading();
            promises.submit = null;
        }
    };
    return returnObject;
}
