import { assignReactiveObject, del, flattenPaths } from "@arrai-innovations/reactive-helpers";
import { useFieldDependencyValuesRegistry } from "@vueda/use/useFieldDependencyValuesRegistry.js";
import { useReactiveHookRegistry } from "@vueda/use/useReactiveHookRegistry.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import compact from "lodash-es/compact.js";
import escapeRegExp from "lodash-es/escapeRegExp.js";
import get from "lodash-es/get.js";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import set from "lodash-es/set.js";
import update from "lodash-es/update.js";
import { computed, provide, reactive, readonly, ref, toRef, watch } from "vue";

/**
 * @module use/useForm
 * @description A composable function for handling form state.
 */

/**
 * @typedef {{[fieldName: string]: FieldValues|any}} FieldValues
 */

/**
 * @typedef {object} FormContextRawState
 *
 * // *** Values & Initial State ***
 * @property {FieldValues} values - The form's values, referenced by lodash key path.
 * @property {FieldValues} submittingValues - The form's values for submission, with ignored fields omitted.
 * @property {{[fieldName: string]: any}} initialValues - The form's initial values (used for resets).
 *
 * // *** Validation & Errors ***
 * @property {{[path: string]: {[errorCode: string]: string}}} errors - Per-field validation errors.
 * @property {boolean} anyError - Whether any field has an error.
 * @property {{[path: string]: {[messageCode: string]: string}}} messages - Per-field validation messages.
 * @property {boolean} anyMessage - Whether any field has a message.
 *
 * // *** Interaction & Focus ***
 * @property {{[path: string]: boolean}} touched - Whether each field has been touched (blurred).
 * @property {boolean} anyTouched - Whether any field has been touched.
 * @property {string|null} focused - The currently focused field (if any).
 *
 * // *** Tracking & Modification ***
 * @property {import('@vueda/use/useReactiveHookRegistry.js').ComputedAggregates} modified - Tracks modified fields.
 * @property {import('vue').ComputedRef<boolean>} anyModified - Whether any field has been modified.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').ComputedAggregates} required - Tracks required fields.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').ComputedAggregates} valid - Tracks field validity.
 *
 * // *** Ignored Fields & Reset Behavior ***
 * @property {{[path: string]: string}} ignored - Fields ignored in validation/submission.
 * @property {boolean} anyIgnored - Whether any field has been ignored.
 *
 * // *** Dependency Management ***
 * @property {{[path: string]: any}} dependencyValues - Resolved dependency values for fields registered via registerDependencyValues.
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
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to update.
 * @param {any} value - The value to update the field with.
 * @private
 */
const updateInitialValue = (state, name, value) => {
    validateName(name);
    if (!isEqual(get(state.initialValues, name), value)) {
        set(state.initialValues, name, value);
    }
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to delete.
 * @private
 */
const deleteInitialValue = (state, name) => {
    validateName(name);
    if (get(state.initialValues, name) !== undefined) {
        del(state.initialValues, name);
    }
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to update.
 * @param {any} value - The value to update the field with.
 * @private
 */
const updateValue = (state, name, value) => {
    validateName(name);
    if (!isEqual(get(state.values, name), value)) {
        set(state.values, name, value);
    }
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to delete.
 * @private
 */
const deleteValue = (state, name) => {
    validateName(name);
    if (get(state.values, name) !== undefined) {
        del(state.values, name);
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

const RESERVED_SERVER_CODE = "server";

const validateReservedServerCode = (code, allowReservedServerCode = false) => {
    if (!allowReservedServerCode && code === RESERVED_SERVER_CODE) {
        throw new Error(
            'Error code "server" is reserved for server-originated validation and cannot be set from local validation. Use a non-reserved code (e.g. "validate" or custom) for client validation.',
        );
    }
};

/**
 *
 * @param {'error'|'message'} kind - The kind of error or message to update.
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {string} code - The code of the error to update.
 * @param {string} message - The message to update.
 * @private
 */
const updateErrorOrMessage = (kind, state, name, code, message, allowReservedServerCode = false) => {
    validateName(name);
    validateCode(code);
    validateMessage(message);
    validateReservedServerCode(code, allowReservedServerCode);
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
 * @param {'error'|'message'} kind - The kind of error or message to clear.
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {string} code - The code of the error to update.
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
 *
 * @param {'error'|'message'} kind - The kind of error or message to clear.
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name (path) of the field whose error or message should be cleared.
 * @param {number} [childIndex] - If provided, clears only the error/message for a specific item in an array field
 *  (e.g., `field[1]`). If omitted, clears the error/message for the entire field.
 * @private
 */
const clearErrorOrMessage = (kind, state, name, childIndex) => {
    let didSomething = false;
    const collection = kind === "error" ? state.errors : state.messages;
    const anyFlagKey = kind === "error" ? "anyError" : "anyMessage";
    if (childIndex !== undefined) {
        const key = `${name}[${childIndex}]`;
        // direct
        if (collection[key]) {
            delete collection[key];
            didSomething = true;
        }
        // nested
        for (const potentialNestedKey of Object.keys(collection)) {
            if (potentialNestedKey.startsWith(`${name}[${childIndex}]`)) {
                delete collection[potentialNestedKey];
                didSomething = true;
            }
        }
    } else {
        if (collection[name]) {
            delete collection[name];
            didSomething = true;
        }
    }
    if (didSomething) {
        state[anyFlagKey] = Object.keys(collection).length > 0;
    }
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {number} [childIndex] - The index of the child field to calculate if it has been modified.
 * @private
 */
const clearErrors = (state, name, childIndex) => {
    validateName(name);
    clearErrorOrMessage("error", state, name, childIndex);
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {number} [childIndex] - The index of the child field to calculate if it has been modified.
 * @private
 */
const clearMessages = (state, name, childIndex) => {
    validateName(name);
    clearErrorOrMessage("message", state, name, childIndex);
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {string} code - The code of the error to update.
 * @param {string} message - The message of the error to update.
 * @private
 */
const updateError = (state, name, code, message) => {
    updateErrorOrMessage("error", state, name, code, message);
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {string} [code] - The code of the error to delete.
 * @private
 */
const deleteError = (state, name, code) => {
    deleteErrorOrMessage("error", state, name, code);
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {string} code - The code of the error to update.
 * @param {string} message
 * @private
 */
const updateMessage = (state, name, code, message) => {
    updateErrorOrMessage("message", state, name, code, message);
};

/**
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to calculate if it has been modified.
 * @param {string} [code] - The code of the error to delete.
 * @private
 */
const deleteMessage = (state, name, code) => {
    deleteErrorOrMessage("message", state, name, code);
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
    const errors = error.errors;
    for (const [name, message] of Object.entries(messages)) {
        updateErrorOrMessage("message", state, name, RESERVED_SERVER_CODE, message, true);
    }
    for (const [name, error] of Object.entries(errors)) {
        updateErrorOrMessage("error", state, name, RESERVED_SERVER_CODE, error, true);
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
 * @param {string[]} clearServerErrorDependents
 * @private
 */
const clearServerErrors = (state, name, clearServerErrorDependents = []) => {
    validateName(name);
    deleteError(state, name, "server");
    deleteMessage(state, name, "server");

    // Intentionally one-hop clearing: each recursive call omits dependents, so we do not
    // traverse a dependent graph (and cannot loop on A<->B dependent declarations).
    for (const dep of clearServerErrorDependents) {
        let resolvedName = dep;
        if (dep.includes("$parent") && name.includes(".")) {
            const parent = name.split(".").slice(0, -1).join(".");
            resolvedName = dep.replace("$parent", parent);
        }
        clearServerErrors(state, resolvedName);
    }
};

/**
 *
 * @param {FormContextState} state - The form context state.
 * @param {string} name - The name of the field to blur.
 * @private
 */
const blur = (state, name) => {
    validateName(name);
    if (state.focused === name) {
        state.focused = null;
    }
    setTouched(state, name);
};

/**
 *
 * @param {FormContextState} state
 * @param {import('vue').Ref<boolean>} hasInitialized
 * @private
 */
const reset = (state, hasInitialized) => {
    // WARNING: do not replace state.values, existing refs will be lost
    assignReactiveObject(state.values, cloneDeep(state.initialValues));
    if (hasInitialized.value) {
        // skip resetting the first time for the sake of tests.
        assignReactiveObject(state.errors, {});
        state.anyError = false;
        assignReactiveObject(state.messages, {});
        assignReactiveObject(state.touched, {});
        state.anyTouched = false;
        state.focused = null;
    } else {
        hasInitialized.value = true;
    }
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
 * Get the first displayed field with an error.
 * @param {FormContextState} state - The form context state.
 * @param {string[]} displayFields - The list of fields being displayed.
 * @param {string[]} arrayFields - The list of array fields.
 * @returns {string|null} - The first displayed field with an error, NON_FIELD_ERRORS_KEY, or null if none exist.
 */
function getFirstErrorField(state, displayFields, arrayFields) {
    const allDisplayFields = [NON_FIELD_ERRORS_KEY, ...displayFields];

    const hasErrors = (field) => state.errors[field] && Object.keys(state.errors[field]).length > 0;
    const getArrayFieldKeys = (baseField, suffix = "") => {
        const regex = new RegExp(`^${baseField}\\[\\d+\\]${escapeRegExp(suffix)}$`);
        return Object.keys(state.errors).filter((key) => regex.test(key));
    };

    // Find the first displayed field with an error
    for (const field of allDisplayFields) {
        if (hasErrors(field)) {
            return field;
        }

        if (arrayFields.includes(field)) {
            // Check array-style errors
            const arrayKeys = getArrayFieldKeys(field);
            if (arrayKeys.some(hasErrors)) {
                return arrayKeys.find(hasErrors);
            }
        }

        // Check for nested fields (e.g., field__child -> field.child)
        const fieldSplit = field.split("__");
        const localFieldName = fieldSplit.pop();
        const parentField = fieldSplit.join(".");
        if (parentField.length && arrayFields.includes(parentField)) {
            const nestedKeys = getArrayFieldKeys(parentField, `.${localFieldName}`);
            for (const key of nestedKeys) {
                if (hasErrors(key)) {
                    return key;
                }
            }
        }
    }

    return null;
}

/**
 * The form context object, providing methods to update form values, errors, messages,
 * touched state, modified state, and form-level behavior.
 *
 * @typedef {object} FormContext
 * @property {FormContextState} state - The reactive form state.
 *
 * // *** Form Reset & State Management ***
 * @property {() => void} reset - Reset the form to its initial values.
 * @property {(displayFields: string[], arrayFields: string[]) => string|null} getFirstErrorField - Get the first displayed field with an error.
 *
 * // *** Value & Initial Value Handling ***
 * @property {(name: string, value: any) => void} updateValue - Update a field's value.
 * @property {(name: string) => void} deleteValue - Delete a field's value.
 * @property {(name: string, value: any) => void} updateInitialValue - Update a field's initial value.
 * @property {(name: string) => void} deleteInitialValue - Delete a field's initial value.
 *
 * // *** Error & Message Handling ***
 * @property {(name: string, childIndex?: number) => void} clearErrors - Clear all errors for a field, or a child's errors if childIndex is given.
 * @property {(name: string, code: string, message: string) => void} updateError - Update a field's error.
 * @property {(name: string, code?: string) => void} deleteError - Delete a field's error.
 * @property {(name: string, code: string, message: string) => void} updateMessage - Update a field's message.
 * @property {(name: string, childIndex?: number) => void} clearMessages - Clear a field's messages, or a child's
 *  messages if childIndex is given.
 * @property {(name: string, code?: string) => void} deleteMessage - Delete a field's message.
 * @property {(error: FormValidationError) => void} handleServerFormValidationError - Handle a server validation error.
 * @property {(name: string, dependants: string[]|undefined) => void} clearServerErrors - clear errors and messages for
 *  the named field and optionally dependants
 *
 * // *** Touch & Focus Management ***
 * @property {(name: string) => void} setTouched - Mark a field as touched.
 * @property {() => void} setAllTouched - Mark all fields as touched.
 * @property {(name: string) => void} clearTouched - Clear the touched state of a field.
 * @property {() => void} clearAllTouched - Clear the touched state of all fields.
 * @property {(name: string) => void} focus - Focus on a field.
 * @property {(name: string) => void} blur - Blur a field.
 *
 * // *** Ignore State Management ***
 * @property {(name: string) => void} ignore - Mark a field as ignored.
 * @property {(name: string) => void} removeIgnore - Remove the ignored state from a field.
 *
 * // *** Hook Registrations ***
 * @property {import('@vueda/use/useReactiveHookRegistry.js').BoundRegisterHook} registerIsModifiedHook -
 *  Register a function to track modification.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').BoundUnregisterHook} unregisterIsModifiedHook -
 *  Unregister a modification tracking function.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').BoundRegisterHook} registerIsRequiredHook -
 *  Register a function to track required state.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').BoundUnregisterHook} unregisterIsRequiredHook -
 *  Unregister a required state tracking function.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').BoundRegisterHook} registerIsValidHook -
 *  Register a function to track validation.
 * @property {import('@vueda/use/useReactiveHookRegistry.js').BoundUnregisterHook} unregisterIsValidHook -
 *  Unregister a validation tracking function.
 *
 * // *** Dependency Management ***
 * @property {(fieldRef: import('vue').Ref<string>, dependencyPathsRef: import('vue').Ref<string[]>) => string} registerDependencyValues -
 *  Register a field's dependency paths for reactive value tracking.
 * @property {(registryId: string) => boolean} unregisterDependencyValues -
 *  Unregister a field from dependency value tracking.
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
 *         if (e instanceof FormValidationError) {
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
 *     <form-field name="field1" label="Field 1">
 *         <form-label>
 *             <widget-input />
 *         </form-label>
 *         <form-help-text />
 *         <form-feedback type="error" />
 *         <form-feedback type="message" />
 *     </form-field>
 *     <form-field name="field2" label="Field 2" validation="numeric" :max-value="100" :min-value="1">
 *         <form-label>
 *             <widget-input step="1" />
 *         </form-label>
 *         <form-help-text />
 *         <form-feedback type="error" />
 *         <form-feedback type="message" />
 *     </form-field>
 *     <Button type="submit" severity="info" />
 * </form>
 * </template>
 * ```
 *
 * @param {FormContextProps} props - The form context's initial values.
 * @returns {FormContext}
 */
export function useForm(props) {
    const hasInitialized = ref(false);
    const modifiedHookRegistry = useReactiveHookRegistry();
    const requiredHookRegistry = useReactiveHookRegistry();
    const validationHookRegistry = useReactiveHookRegistry();

    /** @type {FormContextState} */
    const state = reactive({
        // *** Meta Information ***
        parentPath: "", // keep similar shape to useSubForm

        // *** Values & Initial State ***
        values: {},
        submittingValues: computed(() => {
            if (state.anyIgnored) {
                const ignoredFields = Object.entries(state.ignored)
                    .filter(([, value]) => value === true)
                    .map(([key]) => key);
                const values = omit(cloneDeep(state.values), ignoredFields);
                for (const ignoredField of ignoredFields) {
                    if (ignoredField.match(/.*\[\d+\]$/)) {
                        const arrayField = ignoredField.split("[").slice(0, -1).join("[");
                        update(values, arrayField, (array) => compact(array));
                    }
                }
                return values;
            }
            return state.values;
        }),
        initialValues: {},

        // *** Validation & Errors ***
        errors: {},
        anyError: false,
        messages: {},
        anyMessage: false,

        // *** Interaction & Focus ***
        touched: {},
        anyTouched: false,
        focused: null,

        // *** Tracking & Modification ***
        modified: modifiedHookRegistry.computedAggregates,
        anyModified: computed(() => Object.values(state.modified).some(identity)),
        required: requiredHookRegistry.computedAggregates,
        valid: validationHookRegistry.computedAggregates,

        // *** Ignored Fields & Reset Behavior ***
        ignored: {},
        anyIgnored: false,

        // *** Dependency Management ***
        dependencyValues: {},
    });
    const dependencyRegistry = useFieldDependencyValuesRegistry(state.values);
    state.dependencyValues = dependencyRegistry.dependencyValues;
    // Allow controlled test manipulation
    /* v8 ignore start */
    if (import.meta.env.MODE === "test") {
        if (props.testErrors) {
            state.errors = cloneDeep(props.testErrors);
            state.anyError = !!Object.keys(state.errors).length;
        }
        if (props.testMessages) {
            state.messages = cloneDeep(props.testMessages);
            state.anyMessage = !!Object.keys(state.messages).length;
        }
        if (props.testTouched) {
            state.touched = cloneDeep(props.testTouched);
            state.anyTouched = !!Object.keys(state.touched).length;
        }
    }
    /* v8 ignore end */

    watch(
        toRef(props, "initialValues"),
        (newInitialValues) => {
            // todo: do we need a trigger for this? I could see initial values changing, but not
            //  wanting to reset the form
            if (newInitialValues && !isEqual(state.initialValues, newInitialValues)) {
                // WARNING: do not replace state.initialValues, existing refs will be lost
                assignReactiveObject(state.initialValues, cloneDeep(newInitialValues));
                reset(state, hasInitialized);
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );
    /** @type{FormContext} */
    const formContext = {
        state: readonly(state),

        // *** Form Reset & State Management ***
        reset: reset.bind(null, state, hasInitialized),
        getFirstErrorField: getFirstErrorField.bind(null, state),

        // *** Value & Initial Value Handling ***
        updateValue: updateValue.bind(null, state),
        deleteValue: deleteValue.bind(null, state),
        updateInitialValue: updateInitialValue.bind(null, state),
        deleteInitialValue: deleteInitialValue.bind(null, state),

        // *** Error & Message Handling ***
        clearErrors: clearErrors.bind(null, state),
        updateError: updateError.bind(null, state),
        deleteError: deleteError.bind(null, state),
        clearMessages: clearMessages.bind(null, state),
        updateMessage: updateMessage.bind(null, state),
        deleteMessage: deleteMessage.bind(null, state),
        handleServerFormValidationError: handleServerFormValidationError.bind(null, state),
        clearServerErrors: clearServerErrors.bind(null, state),

        // *** Touch & Focus Management ***
        setTouched: setTouched.bind(null, state),
        setAllTouched: setAllTouched.bind(null, state),
        clearTouched: clearTouch.bind(null, state),
        clearAllTouched: clearAllTouched.bind(null, state),
        focus: focus.bind(null, state),
        blur: blur.bind(null, state),

        // *** Ignore State Management ***
        ignore: ignore.bind(null, state),
        removeIgnore: removeIgnore.bind(null, state),

        // *** Hook Registrations ***
        registerIsModifiedHook: modifiedHookRegistry.registerHook,
        unregisterIsModifiedHook: modifiedHookRegistry.unregisterHook,
        registerIsRequiredHook: requiredHookRegistry.registerHook,
        unregisterIsRequiredHook: requiredHookRegistry.unregisterHook,
        registerIsValidHook: validationHookRegistry.registerHook,
        unregisterIsValidHook: validationHookRegistry.unregisterHook,
        registerDependencyValues: dependencyRegistry.register,
        unregisterDependencyValues: dependencyRegistry.unregister,
    };
    provide(FormContextSymbol, formContext);
    return formContext;
}
