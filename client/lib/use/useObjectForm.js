import { loadingCombine, useLoadingError } from "@arrai-innovations/reactive-helpers";
import { useLeaveUnload } from "@vueda/use/useLeaveUnload.js";
import { getCRUDName } from "@vueda/utils/crudSupport.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import { useToast } from "primevue/usetoast";
import { computed, reactive, toRef } from "vue";
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
 * @property {boolean} loading - Whether the object is loading.
 * @property {Error} error - The error that occurred.
 * @property {boolean} errored - Whether an error occurred.
 * @property {boolean|undefined} submitting - Whether the form is submitting.
 * @property {boolean} running - Whether the object is loading or the form is submitting.
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string} verboseName - The verbose name of the model.
 * @property {boolean} dirty - Whether the form is dirty.
 */

/**
 * @typedef {import('vue').UnwrapRef<ObjectFormRawState>} ObjectFormState
 */

/**
 * Type for handling when there are no changes detected upon submission attempt.
 * @typedef {(options: { formContext: FormContext, toast: import("primevue/toastservice").ToastServiceMethods }) => Promise<boolean>} OnSubmitAnyDirty
 */

/**
 * Type for handling submission when form errors are present.
 * @typedef {(options: { formContext: FormContext, toast: import("primevue/toastservice").ToastServiceMethods }) => Promise<boolean>} OnSubmitAnyError
 */

/**
 * Type for handling errors during form submission.
 * @typedef {(options: { error: Error, formContext: FormContext, toast: import("primevue/toastservice").ToastServiceMethods, isUpdate: boolean, state: ObjectFormState }) => Promise<void>} OnSubmissionError
 */

/**
 * Type for handling successful form submission.
 * @typedef {(options: { isUpdate: boolean, state: ObjectFormState, toast: import("primevue/toastservice").ToastServiceMethods, router: import("vue-router").Router, formContext: FormContext }) => Promise<void>} OnSubmissionSuccess
 */

/**
 * Default implementation for onSubmitAnyDirty hook.
 *
 * @param {object} options
 * @param {import("primevue/toastservice").ToastServiceMethods} options.toast
 * @returns {Promise<boolean>} True if the submission should be stopped.
 */
export const defaultOnSubmitAnyDirty = async ({ toast }) => {
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
    const nonServerErrors = Object.keys(formContext.errors).filter((name) => !name.endsWith(".server"));
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
 * @param {boolean} options.isUpdate - Whether the submission was an update or a create.
 * @param {ObjectFormState} options.state - The form state.
 * @returns {Promise<void>}
 */
export const defaultOnSubmissionError = async ({ error, formContext, toast, isUpdate, state }) => {
    if (error instanceof FormValidationError) {
        formContext.handleServerFormValidationError(error);
        const plural = Object.keys(error.messages).length > 1;
        toast.add({
            severity: "warn",
            summary: "Server-side Validation Failed",
            detail: `Please review the new error${plural ? "s" : ""} displayed.`,
            life: 10000,
        });
    } else {
        // todo: do we provide more detail here, or should it just be display in the page?
        toast.add({
            severity: "error",
            summary: `Failed to ${isUpdate ? "Update" : "Create"} ${state.verboseName}`,
            detail: "Please try again or contact support if the issue persists.",
            life: 10000,
        });
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
        summary: `${state.verboseName} Successfully ${isUpdate ? "Updated" : "Created"}`,
        detail: "Returning to the list view.",
        life: 10000,
    });
    // noinspection ES6MissingAwait
    router.push({
        name: getCRUDName({ app: state.app, model: state.model, view: "list" }),
        params: { app: state.app, model: state.model },
    });
};

/**
 * @typedef {object} ObjectFormInstance
 * @property {ObjectFormState} state - The form state.
 * @property {() => Promise<void>} submit - Submit the form.
 * @property {OnSubmitAnyDirty} onSubmitAnyDirty - The hook to call when the form is submitted with no changes.
 * @property {OnSubmitAnyError} onSubmitAnyError - The hook to call when the form is submitted with errors.
 * @property {OnSubmissionError} onSubmissionError - The hook to call when an error occurs during submission.
 * @property {OnSubmissionSuccess} onSubmissionSuccess - The hook to call when submission is successful
 */

/**
 * This composition function bridges the gap between the generic FormContext (useForm) and data handling ObjectInstance
 *  (useObject, useObjectInstance). It provides a submit function that handles the form submission, and the state of the
 *  form. It also provides a running computed property that is true when the object is loading or the form is submitting.
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
 *     <button type="submit" :disabled="state.running || !formContext.anyDirty">Submit</button>
 *   </form>
 *   <p v-if="state.loading">Loading...</p>
 *   <p v-if="state.error">{{ state.error.message }}</p>
 * </template>
 * ```
 *
 * In this example:
 * - A form with inputs for `name` and `age` is set up, using `v-model` to bind inputs to the form state managed by
 *  `useForm`.
 * - The `submit` function from `useObjectForm` is used to handle the form submission, which involves validating the
 *  form locally, then performing a CRUD operation through `useObjectInstance`.
 * - The `state.running` is a computed property from `useObjectForm` that indicates if the form is currently submitting
 *  or processing, which disables the submit button to prevent multiple submissions.
 * - Feedback such as loading states and error messages is reactively displayed using Vue's conditional rendering.
 * - This setup ensures that the form can handle and display errors from both client-side validation and server
 *  responses, enhancing the user experience by providing real-time feedback.
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
        loading: toRef(loadingError, "loading"),
        error: toRef(loadingError, "error"),
        errored: toRef(loadingError, "errored"),
        /** @type {boolean|undefined} */
        submitting: undefined,
        running: computed(() => loadingCombine(state.loading, state.submitting)),
        app: computed(() => props.app),
        model: computed(() => props.model),
        verboseName: computed(() => props.verboseName),
        dirty: computed(() => formContext.anyDirty.value),
    });
    const returnObject = {
        state,
        submit: () => {
            // prevent multiple submission.
            if (promises.submit) {
                return promises.submit;
            }
            const submitPromise = doSubmit();
            promises.submit = submitPromise;
            return submitPromise;
        },
        onSubmitAnyDirty: defaultOnSubmitAnyDirty,
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
            state.submitting = true;
            if (!formContext.anyDirty) {
                // should we stop if there is nothing changed?
                const stop = await returnObject.onSubmitAnyDirty({ formContext, toast });
                if (stop) {
                    return;
                }
            }
            if (formContext.anyError) {
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
                    ...formContext.values,
                },
            });
            if (instanceObject.state.errored) {
                const error = instanceObject.state.error;
                await returnObject.onSubmissionError({
                    error,
                    formContext,
                    toast,
                    isUpdate,
                    state,
                });
            } else {
                await returnObject.onSubmissionSuccess({
                    formContext,
                    toast,
                    router,
                    isUpdate,
                    state,
                });
            }
        } finally {
            state.submitting = false;
            promises.submit = null;
        }
    };
    return returnObject;
}
