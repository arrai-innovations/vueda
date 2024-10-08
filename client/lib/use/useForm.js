import { assignReactiveObject, del, flattenPaths } from "@arrai-innovations/reactive-helpers";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import set from "lodash-es/set.js";
import { provide, reactive, readonly, toRef, watch } from "vue";

/**
 * @module use/useForm.js - A composable function for handling form state.
 */

/**
 * @typedef {{[fieldName: string]: FieldValues|any}} FieldValues
 */

/**
 * @typedef {object} FormContextRawState
 * @property {FieldValues} values - The form's values, referenced by lodash key path.
 * @property {{[path: string]: {[errorCode: string]: string}}} errors - The form's error
 *  messages, per field, by path. Form-level errors are stored using `NON_FIELD_ERRORS_KEY`.
 * @property {boolean} anyError - Whether any field has an error.
 * @property {{[path: string]: {[messageCode: string]: string}}} messages - The form's
 *  message messages, per field, by flat path. Form-level messages are stored using `NON_FIELD_ERRORS_KEY`.
 * @property {{[path: string]: boolean}} modified - Whether each field has been modified, by path.
 * @property {boolean} anyModified - Whether any field has been modified.
 * @property {{[path: string]: boolean}} touched - Whether each field has been blurred, by path.
 * @property {boolean} anyTouched - Whether any field has been blurred.
 * @property {string|undefined} focused - The field currently in focus.
 * @property {{[fieldName: string]: any}} initialValues - The form's initial values.
 * @property {{string[]}} ignored - The ignored fields on the form
 * @property {boolean} anyIgnored - Whether any field has been ignored.
 *
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FormContextRawState>} FormContextState
 */

const validateName = (name) => {
    if (!name) {
        throw new Error("No name provided");
    }
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @param {any} value
 * @private
 */
const updateValue = (state, name, value) => {
    validateName(name);
    if (!isEqual(get(state.values, name), value)) {
        set(state.values, name, value);
        calculateModified(state, name);
    }
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const deleteValue = (state, name) => {
    validateName(name);
    if (get(state.values, name) !== undefined) {
        del(state.values, name);
        calculateModified(state, name);
    }
};

function validateCode(code) {
    if (!code) {
        throw new Error("No code provided");
    }
}

function validateMessage(message) {
    if (!message) {
        throw new Error("No message provided");
    }
}

/**
 *
 * @param {'error'|'message'} kind
 * @param {FormContextState} state
 * @param {string} name
 * @param {string} code
 * @param {string} message
 * @private
 */
const updateErrorOrMessage = (kind, state, name, code, message) => {
    validateName(name);
    validateCode(code);
    validateMessage(message);
    const collection = kind === "error" ? state.errors : state.messages;
    const anyFlagKey = kind === "error" ? "anyError" : "anyMessage";
    if (!isEqual(collection[name]?.[code], message)) {
        if (!collection[name]) {
            collection[name] = {};
        }
        collection[name][code] = message;
        state[anyFlagKey] = true;
    }
};

/**
 *
 * @param {'error'|'message'} kind
 * @param {FormContextState} state
 * @param {string} name
 * @param {string} code
 * @private
 */
const deleteErrorOrMessage = (kind, state, name, code) => {
    validateName(name);
    let didSomething = false;
    const collection = kind === "error" ? state.errors : state.messages;
    const anyFlagKey = kind === "error" ? "anyError" : "anyMessage";
    if (code) {
        if (collection[name]?.[code]) {
            delete collection[name][code];
            didSomething = true;
        }
    }
    if (collection[name] && (!code || Object.keys(collection[name]).length === 0)) {
        delete collection[name];
        didSomething = true;
    }
    if (didSomething) {
        state[anyFlagKey] = Object.keys(collection).length > 0;
    }
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @param {string} code
 * @param {string} message
 * @private
 */
const updateError = (state, name, code, message) => {
    updateErrorOrMessage("error", state, name, code, message);
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @param {string} [code]
 * @private
 */
const deleteError = (state, name, code) => {
    deleteErrorOrMessage("error", state, name, code);
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @param {string} code
 * @param {string} message
 * @private
 */
const updateMessage = (state, name, code, message) => {
    updateErrorOrMessage("message", state, name, code, message);
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @param {string} [code]
 * @private
 */
const deleteMessage = (state, name, code) => {
    deleteErrorOrMessage("message", state, name, code);
};

/**
 * Set a field as modified, indicating that its value has changed from the initial value.
 *
 * @param {FormContextState} state
 * @param {string} name - the name of the field to set as modified
 * @private
 */
const setModified = (state, name) => {
    validateName(name);
    if (!state.modified[name]) {
        state.modified[name] = true;
    }
    if (!state.anyModified) {
        state.anyModified = true;
    }
};

/**
 * Clear a field as modified, indicating that its value has not changed from the initial value.
 *
 * @param {FormContextState} state
 * @param {string} name - the name of the field to clear as modified
 * @private
 */
const clearModified = (state, name) => {
    validateName(name);
    if (state.modified[name]) {
        delete state.modified[name];
    }
    if (state.anyModified && Object.keys(state.modified).length === 0) {
        state.anyModified = false;
    }
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const calculateModified = (state, name) => {
    validateName(name);
    const value = get(state.values, name);
    const initialValue = get(state.initialValues, name);
    if (!isEqual(value, initialValue) && !state.ignored[name]) {
        setModified(state, name);
    } else {
        clearModified(state, name);
    }
};

/**
 * @param {FormContextState} state
 * @private
 */
const calculateAllModified = (state) => {
    for (const name in state.values) {
        calculateModified(state, name);
    }
};

/**
 *
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const setTouched = (state, name) => {
    validateName(name);
    if (!state.touched[name]) {
        state.touched[name] = true;
    }
    if (!state.anyTouched) {
        state.anyTouched = true;
    }
};

/**
 * @param {FormContextState} state
 * @private
 */
const setAllTouched = (state) => {
    assignReactiveObject(state.touched, Object.fromEntries(flattenPaths(state.values).map((path) => [path, true])));
    if (!state.anyTouched) {
        state.anyTouched = true;
    }
};

/**
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const clearTouch = (state, name) => {
    validateName(name);
    if (state.touched[name]) {
        delete state.touched[name];
    }
    if (state.anyTouched && Object.keys(state.touched).length === 0) {
        state.anyTouched = false;
    }
};

/**
 * @param {FormContextState} state
 * @private
 */
const clearAllTouched = (state) => {
    assignReactiveObject(state.touched, {});
    if (state.anyTouched) {
        state.anyTouched = false;
    }
};

/**
 * Take django form validation messages from a FormValidationError and put them in the form context as errors.
 *
 * @param {FormContextState} state
 * @param {FormValidationError} error
 * @private
 */
const handleServerFormValidationError = (state, error) => {
    const messages = error.messages;
    for (const [name, message] of Object.entries(messages)) {
        updateError(state, name, "server", message);
    }
};

/**
 *
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const focus = (state, name) => {
    validateName(name);
    state.focused = name;
};

/**
 *
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const clearServerError = (state, name) => {
    validateName(name);
    deleteError(state, name, "server");
};

/**
 *
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const blur = (state, name) => {
    validateName(name);
    state.focused = name;
    setTouched(state, name);
    calculateModified(state, name);
    if (state.modified[name]) {
        clearServerError(state, name);
    }
};

/**
 *
 * @param {FormContextState} state
 * @private
 */
const reset = (state) => {
    state.values = cloneDeep(state.initialValues);
    assignReactiveObject(state.errors, {});
    state.anyError = false;
    assignReactiveObject(state.messages, {});
    assignReactiveObject(state.modified, {});
    state.anyModified = false;
    assignReactiveObject(state.touched, {});
    state.anyTouched = false;
    state.focused = undefined;
};

/**
 *
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const ignore = (state, name) => {
    validateName(name);
    if (!state.ignored[name]) {
        state.ignored[name] = true;
    }
    if (!state.anyIgnored) {
        state.anyIgnored = true;
    }
};

/**
 *
 * @param {FormContextState} state
 * @param {string} name
 * @private
 */
const removeIgnore = (state, name) => {
    validateName(name);
    if (state.ignored[name]) {
        delete state.ignored[name];
    }
    if (state.anyIgnored && Object.keys(state.ignored).length === 0) {
        state.anyIgnored = false;
    }
};

/**
 * The form context object, providing methods to update the form's values, errors, messages, touched state, modified
 *  state, and to reset the form.
 *
 * @typedef {object} FormContext
 * @property {FormContextState} state - The form context's reactive state.
 * @property {() => void} reset - Reset the form to its initial values.
 * @property {(name: string, value: any) => void} updateValue - Update a field's value.
 * @property {(name: string) => void} deleteValue - Delete a field's value.
 * @property {(name: string, code: string, message: string) => void} updateError - Update a field's error.
 * @property {(name: string, code?: string) => void} deleteError - Delete a field's error.
 * @property {(name: string, code: string, message: string) => void} updateMessage - Update a field's message.
 * @property {(name: string, code?: string) => void} deleteMessage - Delete a field's message.
 * @property {(name: string) => void} calculateModified - Calculate if a field has been modified.
 * @property {() => void} calculateAllModified - Calculate if all fields have been modified.
 * @property {(name: string) => void} setTouched - Set a field as touched.
 * @property {() => void} setAllTouched - Set all fields as touched.
 * @property {(name: string) => void} clearTouched - Clear a field as touched.
 * @property {() => void} clearAllTouched - Clear all fields as touched.
 *
 * @property {(error: FormValidationError) => void} handleServerFormValidationError - Handle a server form validation
 *  error.
 * @property {(name: string) => void} focus - Focus on a field.
 * @property {(name: string) => void} blur - Blur a field.
 * @property {(name: string) => void} ignore - Ignore a field.
 * @property {(name: string) => void} removeIgnore - remove ignoring a field.
 * @property {(name: string) => void} setModified - mark a field as modified.
 * @property {(name: string) => void} clearModified - clear modified mark of a field.
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
 * @typedef {import('vue').UnwrapNestedRefs<FormContextRawProps>} FormContextProps
 */

/**
 * Generate and provide a form context for a form, using the provided initial values, including methods to update the
 *  form's values, errors, messages, touched state, modified state, and to reset the form.
 *
 * @example
 * ```vue
 * <script setup>
 * import Button from "primevue/button";
 * const myState = reactive({
 *     submitting: false,
 *     // when initialValues is changed, the form's values are reset to match
 *     initialValues: {},
 * });
 * const formContext = useForm(myState);
 * const handleSubmit = async () => {
 *     try {
 *         myState.submitting = true;
 *         // allow all validation to run
 *         formContext.setAllTouched();
 *         await nextTick();
 *         if (formContext.anyError) {
 *             return;
 *         }
 *         if (!formContext.anyModified) {
 *             return;
 *         }
 *         await submitToServer(formContext.values);
 *     } catch (e) {
 *         if (e isinstance FormValidationError) {
 *             formContext.handleServerFormValidationError(e);
 *             return;
 *         }
 *         throw e;
 *     } finally {
 *         myState.submitting = false;
 *     }
 * };
 * </script>
 * <template>
 * <form @submit.prevent="handleSubmit">
 *     <form-feedback type="error" />
 *     <form-feedback type="message" />
 *     <field-string name="field1" label="Field 1" :trim="true">
 *         <form-label>
 *             <widget-input />
 *         </form-label>
 *         <form-help-text />
 *         <form-feedback type="error" />
 *         <form-feedback type="message" />
 *     </field-string>
 *     <field-number name="field2" label="Field 2" :max-value="100" :min-value="1">
 *         <form-label>
 *             <widget-input step="1" />
 *         </form-label>
 *         <form-help-text />
 *         <form-feedback type="error" />
 *         <form-feedback type="message" />
 *     </field-number>
 *     <Button type="submit" severity="info" />
 * </form>
 * </template>
 * ```
 *
 * @param {FormContextProps} props - The form context's initial values.
 * @returns {FormContext}
 */
export function useForm(props) {
    const state = reactive({
        values: {},
        errors: {},
        anyError: false,
        messages: {},
        modified: {},
        anyModified: false,
        touched: {},
        anyTouched: false,
        initialValues: toRef(props, "initialValues"),
        focused: undefined,
        ignored: {},
        anyIgnored: false,
    });
    watch(
        toRef(state, "initialValues"),
        (initialValues) => {
            // todo: do we need a trigger for this? I could see initial values changing, but not
            //  wanting to reset the form
            if (initialValues && !isEqual(state.values, initialValues)) {
                reset(state);
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
    const formContext = {
        state: readonly(state),
        updateValue: updateValue.bind(null, state),
        deleteValue: deleteValue.bind(null, state),
        updateError: updateError.bind(null, state),
        deleteError: deleteError.bind(null, state),
        updateMessage: updateMessage.bind(null, state),
        deleteMessage: deleteMessage.bind(null, state),
        calculateModified: calculateModified.bind(null, state),
        calculateAllModified: calculateAllModified.bind(null, state),
        setTouched: setTouched.bind(null, state),
        setAllTouched: setAllTouched.bind(null, state),
        clearTouched: clearTouch.bind(null, state),
        clearAllTouched: clearAllTouched.bind(null, state),
        handleServerFormValidationError: handleServerFormValidationError.bind(null, state),
        focus: focus.bind(null, state),
        blur: blur.bind(null, state),
        reset: reset.bind(null, state),
        ignore: ignore.bind(null, state),
        removeIgnore: removeIgnore.bind(null, state),
        setModified: setModified.bind(null, state),
        clearModified: clearModified.bind(null, state),
    };
    provide(FormContextSymbol, formContext);
    return formContext;
}
