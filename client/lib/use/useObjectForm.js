import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import { useLeaveUnload } from "@vueda/use/useLeaveUnload.js";
import { LIST_VIEW_CRUD_NAME, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { useToast } from "primevue/usetoast";
import { computed, nextTick, reactive } from "vue";
import { useRouter } from "vue-router";

/**
 * @module use/useObjectForm.js
 */

/**
 * @typedef {object} ObjectFormRawProps
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string} verboseName - The verbose name of the model.
 */

/**
 * @typedef {import('vue').UnwrapRef<ObjectFormRawProps>} ObjectFormProps
 */

/**
 * @typedef {object} ObjectFormRawState
 * @property {boolean|undefined} loading - Whether the object form is submitting. Does not include object loading.
 * @property {Error|null} error - The error that occurred.
 * @property {boolean} errored - Whether an error occurred.
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string} verboseName - The verbose name of the model.
 * @property {boolean} modified - Whether the form has changes from the initial values.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ObjectFormRawState>} ObjectFormState
 */

/**
 * Type for handling when there are no changes detected upon submission attempt.
 * @typedef {(options: {
 *     formContext: FormContext,
 *     toast: import("primevue/toastservice").ToastServiceMethods
 * }) => Promise<boolean>} OnSubmitNotAnyModified
 */

/**
 * Type for handling submission when form errors are present.
 * @typedef {(options: {
 *     formContext: FormContext,
 *     toast: import("primevue/toastservice").ToastServiceMethods
 * }) => Promise<boolean>} OnSubmitAnyError
 */

/**
 * Type for handling errors during form submission.
 * @typedef {(options: {
 *     error: Error,
 *     formContext: FormContext,
 *     toast: import("primevue/toastservice").ToastServiceMethods,
 *     isUpdate: boolean,
 *     state: ObjectFormState
 * }) => Promise<Boolean>} OnSubmissionError
 */

/**
 * Type for handling successful form submission.
 * @typedef {(options: {
 *     isUpdate: boolean,
 *     state: ObjectFormState,
 *     toast: import("primevue/toastservice").ToastServiceMethods,
 *     router: import("vue-router").Router,
 *     formContext: FormContext
 * }) => Promise<void>} OnSubmissionSuccess
 */

/**
 * Default implementation for onSubmitNotAnyModified hook.
 *
 * @param {object} options
 * @param {import("primevue/toastservice").ToastServiceMethods} options.toast
 * @returns {Promise<boolean>} True if the submission should be stopped.
 */
export const defaultOnSubmitNotAnyModified = async ({ toast }) => {
    toast.add({
        severity: "info",
        summary: "No Changes Detected",
        detail: "Please modify the fields before submitting.",
        life: 10000,
    });
    return true;
};

/**
 * Default implementation for onSubmitAnyError hook.
 *
 * @param {object} options
 * @param {import("primevue/toastservice").ToastServiceMethods} options.toast
 * @param {FormContext} options.formContext
 * @returns {Promise<boolean>} True if the submission should be stopped.
 */
export const defaultOnSubmitAnyError = async ({ formContext, toast }) => {
    const nonServerErrors = Object.entries(formContext.state.errors)
        .map(([key, value]) => [key, omit(value, "server")])
        .filter(([, value]) => !isEmpty(value));
    // if there are server errors, they should disappear on blur of that field.
    // if there are server messages on one field related to multiple, you might resolve the issue by
    //  changing a difference field.
    // let them recheck with the server if only server validation errors exist.
    if (nonServerErrors.length) {
        const plural = nonServerErrors.length > 1;
        // no submission if there are errors
        toast.add({
            severity: "warn",
            summary: "Submission Blocked",
            detail: `Please correct the highlighted error${plural ? "s" : ""}.`,
            life: 10000,
        });
        return true;
    }
    return false;
};

/**
 * Default implementation for onSubmissionError hook.
 *
 * @param {object} options
 * @param {Error} options.error - The error that occurred.
 * @param {FormContext} options.formContext - The form context.
 * @param {import("primevue/toastservice").ToastServiceMethods} options.toast - The toast service.
 * @returns {Promise<boolean>} - True if the error should be marked as handled. Otherwise it may be displayed.
 */
export const defaultOnSubmissionError = async ({ error, formContext, toast }) => {
    if (error instanceof FormValidationError) {
        formContext.handleServerFormValidationError(error);
        const plural = Object.keys(error.messages).length > 1;
        toast.add({
            severity: "warn",
            summary: "Server-side Validation Failed",
            detail: `Please review the new error${plural ? "s" : ""} displayed.`,
            life: 10000,
        });
        return true;
    }
};

/**
 * Default implementation for onSubmissionSuccess hook.
 *
 * @param {object} options
 * @param {boolean} options.isUpdate - Whether it was a create or update submission.
 * @param {import("primevue/toastservice").ToastServiceMethods} options.toast - The toast service.
 * @param {import("vue-router").Router} options.router - The router.
 * @param {ObjectFormState} options.state - The form state.
 * @returns {Promise<void>}
 */
export const defaultOnSubmissionSuccess = async ({ isUpdate, state, toast, router }) => {
    toast.add({
        severity: "success",
        summary: `${memoizedStartCase(state.verboseName)} Successfully ${isUpdate ? "Updated" : "Created"}`,
        detail: "Returning to the list view.",
        life: 10000,
    });
    // noinspection ES6MissingAwait
    router.push({
        name: LIST_VIEW_CRUD_NAME,
        params: { app: state.app, model: state.model, action: "list" },
    });
};

/**
 * @typedef {object} ObjectFormInstance
 * @property {ObjectFormState} state - The form state.
 * @property {() => Promise<void>} submit - Submit the form.
 * @property {OnSubmitNotAnyModified} onSubmitNotAnyModified - The hook to call when the form is submitted with no changes.
 * @property {OnSubmitAnyError} onSubmitAnyError - The hook to call when the form is submitted with errors.
 * @property {OnSubmissionError} onSubmissionError - The hook to call when an error occurs during submission.
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
 * import { reactive } from 'vue';
 * import { useForm, useObjectForm, useObjectInstance } from 'path/to/composition-functions';
 *
 * // Component props
 * const props = defineProps({
 *   app: String,
 *   model: String,
 * });
 *
 * // Setup form context with initial values
 * const initialValues = reactive({ name: '', age: 0 });
 * const formContext = useForm({ initialValues });
 *
 * // Object instance for CRUD operations
 * const objectInstance = useObjectInstance({
 *   props: reactive({ id: '123', app: props.app, model: props.model }),
 *   functions: {
 *       // CRUD functions
 *   }
 * });
 *
 * // Object form handling
 * const { submit, state } = useObjectForm(props, formContext, objectInstance);
 * </script>
 * <template>
 *   <form @submit.prevent="submit">
 *     <input v-model="formContext.values.name" placeholder="Name" />
 *     <input v-model="formContext.values.age" placeholder="Age" type="number" />
 *     <button type="submit" :disabled="state.loading || !formContext.anyModified">Submit</button>
 *   </form>
 *   <p v-if="state.loading">Loading...</p>
 *   <p v-if="state.error">{{ state.error.message }}</p>
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
    const state = reactive({
        loading: loadingError.loading,
        error: loadingError.error,
        errored: loadingError.errored,
        app: computed(() => props.app),
        model: computed(() => props.model),
        verboseName: computed(() => props.verboseName),
        modified: computed(() => formContext.state.anyModified),
    });
    const returnObject = {
        state,
        submit: () => {
            // prevent multiple submission.
            if (promises.submit) {
                return promises.submit;
            }
            // debug, don't submit, just toast the current state.
            toast.add({
                severity: "info",
                summary: "Debug",
                detail: JSON.stringify(formContext.state, null, 2),
            });
            const submitPromise = doSubmit();
            promises.submit = submitPromise;
            return submitPromise;
        },
        onSubmitNotAnyModified: defaultOnSubmitNotAnyModified,
        onSubmitAnyError: defaultOnSubmitAnyError,
        onSubmissionError: defaultOnSubmissionError,
        onSubmissionSuccess: defaultOnSubmissionSuccess,
    };
    useLeaveUnload(state);
    const toast = useToast();
    const router = useRouter();
    const promises = {
        submit: null,
    };

    const doSubmit = async () => {
        try {
            // start 'submitting' right away, makes it useful for disabling the submit button.
            loadingError.clearError();
            loadingError.setLoading();
            // set all fields as touched to show errors
            formContext.setAllTouched();
            // wait for validation watchers to run
            await nextTick();
            if (!formContext.state.anyModified) {
                // should we stop if there is nothing changed?
                const stop = await returnObject.onSubmitNotAnyModified({ formContext, toast });
                if (stop) {
                    return;
                }
            }
            if (formContext.state.anyError) {
                // should we stop for errors?
                const stop = await returnObject.onSubmitAnyError({ formContext, toast });
                if (stop) {
                    return;
                }
            }
            const isUpdate = !!instanceObject.state.object.id;
            const createOrUpdate = isUpdate ? instanceObject.update : instanceObject.create;
            await createOrUpdate({
                object: {
                    id: instanceObject.state.object.id,
                    ...formContext.state.values,
                },
            });
            if (instanceObject.state.errored) {
                const error = instanceObject.state.error;
                const handled = await returnObject.onSubmissionError({
                    error,
                    formContext,
                    toast,
                    isUpdate,
                    state,
                });
                if (handled) {
                    instanceObject.clearError();
                }
                // otherwise, whatever is looking at instanceObject.state.error will handle it.
            } else {
                await returnObject.onSubmissionSuccess({
                    formContext,
                    toast,
                    router,
                    isUpdate,
                    state,
                });
            }
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
