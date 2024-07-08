import { FormContextSymbol } from "../utils/symbols.js";
import { assignReactiveObject, del } from "@arrai-innovations/reactive-helpers";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { provide, reactive, readonly, ref, watch } from "vue";

/**
 * The raw form context object.
 *
 * @typedef {object} FormContextRaw
 * @property {import('vue').UnwrapRef<{[fieldName: string]: any}>} values - The form's values.
 * @property {import('vue').UnwrapRef<{[fieldName: string]: {[errorCode: string]: string}}>} errors - The form's error
 *  messages, per field. Form-level errors are stored using `NON_FIELD_ERRORS_KEY`.
 * @property {import('vue').UnwrapRef<{[fieldName: string]: {[messageCode: string]: string}}>} messages - The form's
 *  message messages, per field. Form-level messages are stored using `NON_FIELD_ERRORS_KEY`.
 * @property {import('vue').UnwrapRef<{[fieldName: string]: boolean}>} dirty - The form's dirty state per field.
 * @property {import('vue').Ref<boolean>} anyDirty - Whether any field is dirty.
 * @property {import('vue').Ref<(formContext: FormContext) => void>} doSubmit - The function to call when the form is
 *  submitted.
 * @property {import('vue').Ref<string|undefined>} focused - The field currently in focus.
 * @property {import('vue').UnwrapRef<{[fieldName: string]: any}>} initialValues - The form's initial values.
 * @property {() => void} reset - Reset the form to its initial values.
 * @property {(name: string, value: any) => void} updateValue - Update a field's value.
 * @property {(name: string) => void} deleteValue - Delete a field's value.
 * @property {(name: string, code: string, message: string) => void} updateError - Update a field's error.
 * @property {(name: string, code?: string) => void} deleteError - Delete a field's error.
 * @property {(name: string, code: string, message: string) => void} updateMessage - Update a field's message.
 * @property {(name: string, code?: string) => void} deleteMessage - Delete a field's message.
 * @property {(name: string) => void} setDirty - Set a field as dirty.
 * @property {(name: string) => void} clearDirty - Clear a field's dirty state.
 * @property {() => void} resetAllDirty - Reset all fields' dirty state.
 * @property {(fn: (formContext: FormContext) => void) => void} updateDoSubmit - Update the function to call when the
 *  form is submitted.
 * @property {(error: FormValidationError) => void} handleServerFormValidationError - Handle a server form validation
 *  error.
 * @property {(name: string) => void} focus - Focus on a field.
 * @property {(name: string) => void} blur - Blur a field.
 */

/**
 * The form context object, providing methods to update the form's values, errors, messages, dirty state, and to reset
 *  the form.
 *
 * @typedef {Readonly<FormContextRaw>} FormContext
 */

/**
 * The raw reactive props for the useForm function.
 *
 * @typedef {object} FormContextRawProps
 * @property {{[fieldName: string]: any}} initialValues - The form's initial values. Not mutated, but changes reset the
 *  form.
 */

/**
 * The reactive arguments for the useForm function.
 *
 * @typedef {import('vue').UnwrapRef<FormContextRawProps>} FormContextProps
 */

/**
 * Generate and provide a form context for a form, using the provided initial values, including methods to update the
 *  form's values, errors, messages, dirty state, and to reset the form.
 *
 * @param {FormContextProps} props - The form context's initial values.
 * @returns {FormContext}
 */
export function useForm(props) {
    const values = reactive({});
    const errors = reactive({});
    const messages = reactive({});
    const dirty = reactive({});
    const anyDirty = ref(false);
    const doSubmit = ref(undefined);
    const focused = ref(undefined);
    const initialValues = reactive(props.initialValues);

    const reset = () => {
        assignReactiveObject(values, initialValues);
        assignReactiveObject(errors, {});
        assignReactiveObject(messages, {});
        assignReactiveObject(dirty, {});
        anyDirty.value = false;
    };
    const clearServerError = (name) => {
        if (name) {
            if (get(errors, `${name}.server`)) {
                del(errors, `${name}.server`);
            }
        } else {
            throw new Error("No name provided to clearServerError");
        }
    };
    const updateValue = (name, value) => {
        if (name) {
            set(values, name, value);
        } else {
            throw new Error("No name provided to updateValue");
        }
    };
    const deleteValue = (name) => {
        if (name) {
            if (get(values, name) !== undefined) {
                del(values, name);
            }
        } else {
            throw new Error("No name provided to deleteValue");
        }
    };
    const focus = (name) => {
        focused.value = name;
    };
    const blur = (name) => {
        focused.value = name;
        clearServerError(name);
    };
    const updateError = (name, code, message) => {
        if (name && code && message) {
            set(errors, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateError");
        }
    };
    const deleteError = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(errors, key)) {
                del(errors, key);
            }
        } else {
            throw new Error("No name provided to deleteError");
        }
    };
    const updateMessage = (name, code, message) => {
        if (name && code && message) {
            set(messages, `${name}.${code}`, message);
        } else {
            throw new Error("No name or code or message provided to updateMessage");
        }
    };
    const deleteMessage = (name, code) => {
        if (name) {
            const key = code ? `${name}.${code}` : name;
            if (get(messages, key)) {
                del(messages, key);
            }
        } else {
            throw new Error("No name provided to deleteMessage");
        }
    };
    const setDirty = (name) => {
        if (name) {
            set(dirty, name, true);
            // only you can prevent over-reactivity
            if (!anyDirty.value) {
                anyDirty.value = true;
            }
        } else {
            throw new Error("No name provided to updateDirty");
        }
    };
    const clearDirty = (name) => {
        if (name) {
            del(dirty, name);
            anyDirty.value = Object.keys(dirty).length > 0;
        } else {
            throw new Error("No name provided to deleteDirty");
        }
    };
    const resetAllDirty = () => {
        assignReactiveObject(dirty, {});
        anyDirty.value = false;
    };
    const updateDoSubmit = (fn) => {
        doSubmit.value = fn;
    };
    /**
     * handleServerFormValidationError - take django form validation messages from a
     *  FormValidationError and put them in the form context as errors
     * @param {FormValidationError} error - the error to handle
     */
    const handleServerFormValidationError = (error) => {
        const messages = error.messages;
        for (const [name, message] of Object.entries(messages)) {
            updateError(name, "server", message);
        }
    };
    watch(
        initialValues,
        (initialValues) => {
            // todo: do we need a trigger for this? I could see initial values changing, but not
            //  wanting to reset the form
            if (initialValues) {
                assignReactiveObject(values, cloneDeep(initialValues));
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
    const formContext = readonly({
        values,
        errors,
        messages,
        dirty,
        anyDirty,
        doSubmit,
        initialValues,
        focused,
        reset,
        updateValue,
        deleteValue,
        updateError,
        deleteError,
        updateMessage,
        deleteMessage,
        setDirty,
        clearDirty,
        resetAllDirty,
        updateDoSubmit,
        handleServerFormValidationError,
        focus,
        blur,
    });
    provide(FormContextSymbol, formContext);
    return formContext;
}
