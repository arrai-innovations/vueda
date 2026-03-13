/**
 * @module use/useField
 * @description Provides reactive field context including value tracking, validation, required-state, and server error handling for individual form fields.
 */
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import isString from "lodash-es/isString.js";
import omit from "lodash-es/omit.js";
import { computed, inject, onUnmounted, provide, reactive, readonly, toRef, unref, watch } from "vue";

/**
 * Vue component props definition for field components. Spread into component options to include
 * standard field identification, validation, display, value handling, and form context behavior props.
 *
 * @vueda-spread props
 */
export const FIELD_PROPS = {
    // *** Identification & Metadata ***
    /** The field name, used as the path to look up and store the value in the form state. */
    name: { type: String, required: true },
    /** The name of the form model for configuration lookup; usually provided by a parent field renderer. */
    formModelName: { type: String, default: undefined },
    /** Other fields whose server errors should be cleared when this field's value changes. */
    /* v8 ignore next 1 */
    clearServerErrorDependents: { type: Array, default: () => [] },
    /** Other field paths this field depends on; their values are passed to validation and required functions. */
    /* v8 ignore next 1 */
    validationDependencies: { type: Array, default: () => [] },
    /** Whether the field is read-only; disables editing and skips required validation. */
    readOnly: { type: Boolean, default: false },

    // *** Validation ***
    /** Whether the field is required. */
    required: { type: Boolean, default: null },
    /** Error message shown when a required field is left empty. */
    requiredMessage: { type: String, default: "This field is required." },
    /** Custom function that determines whether the field should be required based on dependency values. */
    shouldRequireFn: { type: Function, default: null },
    /** Custom function that checks whether a value violates the required rule; defaults to rejecting null, undefined, empty string, false, and 0. */
    isRequiredViolation: { type: Function, default: null },
    /** Custom validation function; should return true when valid or an error message string when invalid. */
    validate: { type: Function, default: null },

    // *** Display ***
    /** The label shown next to the field; defaults to the field name when omitted. */
    label: { type: String, default: null },
    /** Help text displayed alongside the field. */
    help: { type: String, default: "" },

    // *** Value Handling ***
    /** The field's external model value; used only in contextless mode (v-model binding). */
    modelValue: { type: [String, Number, Boolean, Array, Object], default: undefined },

    // *** Form Context Behavior ***
    /** When true, the field ignores any surrounding form context and manages its own state. */
    contextless: { type: Boolean, default: false },
};

/**
 * Array of Vue event names emitted by field components. Pass to the `emits` option of a field component.
 *
 * @vueda-spread emits
 */
export const FIELD_EMITS = [
    /** Emitted when the field value changes. */
    "update:modelValue",
];

/**
 * Determines whether a value would **violate a required field rule**.
 *
 * This function is used in required field validation checks.
 * A value is considered a violation if it is `null`, `undefined`, `""`, `false`, or `0`.
 *
 * @param {any} value - The value to evaluate.
 * @returns {boolean} `true` if the value violates required field constraints, otherwise `false`.
 */
export function defaultIsRequiredViolation(value) {
    return value === null || value === undefined || value === "" || value === false || value === 0;
}

/**
 * @typedef {object} FieldContextRawState
 *
 * // *** Identification & Metadata ***
 * @property {import('vue').ComputedRef<string>} name - The name of the field. This is the path to look up the value of the field in the form context.
 * @property {import('vue').ComputedRef<string>} [formModelName] - The name of the form model for configuration lookup.
 * @property {import('vue').ComputedRef<string[]>} clearServerErrorDependents - The clearServerErrorDependents for the field.
 * @property {import('vue').ComputedRef<string[]>} validationDependencies - The validationDependencies for the field.
 * @property {import('vue').ComputedRef<boolean>} readOnly - Whether the field is read-only.
 *
 * // *** Validation & Display ***
 * @property {import('vue').ComputedRef<string>} label - The label for the field.
 * @property {import('vue').ComputedRef<boolean>} required - Whether the field is required.
 * @property {import('vue').ComputedRef<boolean>} valid - Whether the field is valid.
 * @property {import('vue').ComputedRef<string>} help - The help text for the field.
 *
 * // *** Value Handling ***
 * @property {import('vue').WritableComputedRef<any>} value - The current value of the field.
 * @property {import('vue').WritableComputedRef<any>} submittingValue -The current value of the field while accounting for ignored fields.
 * @property {import('vue').ComputedRef<any>} initialValue - The initial value of the field.
 * @property {import('vue').ComputedRef<boolean>} valueIsInitial - Whether the current value matches the initial value.
 * @property {import('vue').ComputedRef<boolean>} initialValueUnset - Whether the initial value is considered empty.
 * @property {import('vue').ComputedRef<boolean>} valueUnset - Whether the current value is considered empty.
 *
 * // *** Messages & Errors ***
 * @property {import('vue').ComputedRef<{[code: string]: string}>|{[code: string]: string}} messages - The messages for the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>|{[code: string]: string}} errors - The errors for the field.
 *
 * // *** Interaction & State Tracking ***
 * @property {import('vue').ComputedRef<boolean>} touched - Whether the field has been touched.
 * @property {import('vue').ComputedRef<boolean>} modified - Whether the field has been modified.
 * @property {import('vue').ComputedRef<boolean>} ignored - Whether the field is ignored.
 * @property {import('vue').ComputedRef<boolean>} focused - Whether the field is focused.
 *
 * // *** Dependency Management ***
 * @property {import('vue').ComputedRef<{[path: string]: any}>} [dependencyValues] - The resolved dependency values for the field.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FieldContextRawState>} FieldContextState
 */

/**
 * The field context object, providing reactive properties and methods to update the field's state and behavior.
 *
 * @typedef {object} FieldContext
 * @property {FieldContextState} state - The reactive state of the field.
 *
 * // *** Value Management ***
 * @property {(newValue: any) => void} updateValue - Updates the field's value.
 * @property {() => void} deleteValue - Deletes the field's value, resetting it.
 * @property {(newValue: any) => void} updateInitialValue - Updates the field's initial value.
 * @property {() => void} deleteInitialValue - Deletes the field's initial value.
 *
 * // *** Error Handling ***
 * @property {(code: string, message: string) => void} updateError - Updates the error message for a given code.
 * @property {(code: string) => void} deleteError - Removes a specific error by code.
 * @property {(childIndex:number|undefined) => void} clearErrors - Clears all errors associated with this field.
 *
 * // *** Message Handling ***
 * @property {(code: string, message: string) => void} updateMessage - Updates a specific message.
 * @property {(code: string) => void} deleteMessage - Removes a message by code.
 * @property {(childIndex:number|undefined) => void} clearMessages - Clears all messages.
 *
 * // *** Field Interactions ***
 * @property {() => void} setTouched - Marks the field as "touched" (e.g., user clicked away).
 * @property {() => void} clearTouched - Clears the touched state of the field, making it "untouched."
 * @property {() => void} focus - Focuses on the field (usually for accessibility or validation).
 * @property {() => void} blur - Blurs (un-focuses) the field.
 *
 * // *** Field Ignoring ***
 * @property {(name?:string) => void} ignore - Marks the field as ignored, so validation does not apply.
 * @property {(name?:string) => void} removeIgnore - Removes the ignore status, making the field active again.
 *
 * // *** Hook Registration ***
 * @property {(hook: () => boolean) => string} registerIsModifiedHook - Registers a hook that determines if the field is modified.
 * @property {(id: string) => void} unregisterIsModifiedHook - Unregisters a previously registered modified-state hook.
 * @property {(hook: () => boolean) => string} registerIsRequiredHook - Registers a hook that determines if the field is required.
 * @property {(id: string) => void} unregisterIsRequiredHook - Unregisters a previously registered required-state hook.
 * @property {(hook: () => boolean | string) => string} registerIsValidHook - Registers a hook that determines if the field is valid.
 * @property {(id: string) => void} unregisterIsValidHook - Unregisters a previously registered validation-state hook.
 *
 * // *** Dependency Management ***
 * @property {(hook: (dependencyValues: {[path: string]: any}) => void) => string} registerDependencyValues - Registers a field with its dependency paths.
 * @property {(id: string) => void} unregisterDependencyValues - Unregisters a field for dependency tracking.
 */

/**
 * @typedef {object} FieldContextRawProps
 * // *** Identification & Metadata ***
 * @property {string} name - The name of the field.
 * @property {string} [formModelName] - The name of the form model for configuration lookup.
 * @property {string[]} [clearServerErrorDependents=[]] - Other fields that depend on this field.
 * @property {string[]} [validationDependencies=[]] - Other fields that this field depends on.
 * @property {boolean} [readOnly=false] - Whether the field is read-only.
 *
 * // *** Validation ***
 * @property {boolean} [required=null] - Whether the field is required.
 * @property {string} [requiredMessage="This field is required."] - The message to display if the field is required and empty.
 * @property {(validationDependencies: {[path: string]: [value: any]}|undefined) => boolean} [shouldRequireFn=null] - A custom function
 *  that determines whether the field should be marked as required based on its configuration or validationDependencies (i.e.
 *  "can be required"). When provided, this overrides the explicit `required` prop.
 * @property {(value: any) => boolean} [isRequiredViolation=null] - A custom function that checks whether the current field
 *  value violates the required rule (i.e. "is a violation"). The default behavior returns true when the value is null,
 *  undefined, an empty string, false, or 0.
 * @property {(value: any, validationDependencies: {[path: string]: [value: any]}|undefined) => boolean} [validate=null] - A custom
 *  validation function for the field. This function should return `true` when the field is valid. Otherwise, it should
 *  return a string with the desired error message.
 *
 * // *** Display ***
 * @property {string} [label=null] - The label for the field.
 * @property {string} [help=""] - The help text for the field.
 *
 * // *** Value Handling ***
 * @property {any} [modelValue] - The field's external model value (only used in context-less mode).
 *
 * // *** Form Context Behavior ***
 * @property {boolean} [contextless=false] - If `true`, the field will ignore the form context and manage its own state.
 */

/**
 * The reactive arguments for the useField function. (Matches FIELD_PROPS).
 *
 * @typedef {import('vue').UnwrapNestedRefs<FieldContextRawProps>} FieldContextProps
 */

/**
 * Determines whether a field's value is **unset** (i.e., it has not been explicitly set).
 *
 * Unlike `defaultIsRequiredViolation`, this function is used for **form state tracking** to determine
 * whether a field has been given a meaningful value by the user.
 *
 * @param {any} value - The value to evaluate.
 * @returns {boolean} `true` if the field is considered unset, otherwise `false`.
 */
export function isUnsetValue(value) {
    return value === undefined || value === null || value === "";
}

const defaultRequiredMessage = "This field is required.";
const defaultValidationFailedMessage = "Validation Failed";
const reservedServerCode = "server";
const reservedServerCodeError =
    'Error code "server" is reserved for server-originated validation and cannot be set from local validation. Use a non-reserved code (e.g. "validate" or custom) for client validation.';

const validateNonReservedCode = (code) => {
    if (code === reservedServerCode) {
        throw new Error(reservedServerCodeError);
    }
};

/* v8 ignore start */
/**
 * Additional test-only props for controlling local form context.
 *
 * @typedef {object} FieldContextTestProps
 * @property {{[code: string]: string}} [testErrors]
 * @property {{[code: string]: string}} [testMessages]
 * @property {boolean} [testTouched]
 * @property {boolean} [testFocused]
 * @property {{[name: string]: boolean}} [testIgnored]
 * @property {any} [testInitialValue]
 * @private
 */
/**
 * Sets up the field props for testing.
 * @param {FieldContextTestProps} props - The field context's reactive props.
 * @param {import('vue').UnwrapNestedRefs<FieldContextRawState>} localFormContext - The local form context.
 * @private
 */
const setupFieldPropsForTest = (props, localFormContext) => {
    if (import.meta.env.MODE === "test") {
        for (const [propKey, contextKey] in [
            ["testErrors", "errors"],
            ["testMessages", "messages"],
            ["testTouched", "touched"],
            ["testFocused", "focused"],
            ["testIgnored", "ignored"],
            ["testInitialValue", "initialValue"],
        ]) {
            if (props[propKey]) {
                localFormContext[contextKey] = props[propKey];
            }
        }
    }
};
/* v8 ignore end */

/**
 * Generate and provide a field context for a field.
 *
 * @param {FieldContextProps} props - The field context's reactive props.
 * @param {import('vue').EmitFn} emit - The component emit function.
 * @returns {FieldContext} The field context object.
 */
export function useField(props, emit) {
    /** @type {import('@vueda/use/useForm.js').FormContext|null} */
    const rawFormContext = inject(FormContextSymbol, null);
    const formContext = computed(() => (!props.contextless ? unref(rawFormContext) : null));
    const amIModified = () => {
        return !state.valueIsInitial && !state.ignored && !(state.initialValueUnset && state.valueUnset);
    };
    const amIRequired = () => {
        if (state.readOnly || state.ignored) {
            return false;
        }
        let required = props.required ?? true;
        const shouldRequireFn = props.shouldRequireFn;
        if (shouldRequireFn) {
            required = !!shouldRequireFn(cloneDeep(deepUnref(state.dependencyValues)) || {});
        }
        return !!required;
    };
    const amIValid = () => {
        if (!state.touched || !props.validate) {
            return true;
        }
        const result = props.validate(cloneDeep(unref(state.value)), cloneDeep(deepUnref(state.dependencyValues)));
        return result === true ? true : isString(result) ? result : defaultValidationFailedMessage;
    };

    // When not in context, or contextless, take over some functionality normally provided by the form context.
    const localFormContext = reactive({
        errors: {},
        messages: {},
        touched: false,
        ignored: {},
        initialValue: cloneDeep(props.modelValue),
        focused: false,
    });

    // ⚠️ Do not assign computed() directly to state.messages/errors.
    // Vue unwraps computed refs inside reactive(), allowing silent deep mutation:
    //   e.g. state.errors.code = '...' will not throw, and allow mutation of the cached value, until the computed reruns.
    //
    // Instead, use readonly(toRef(...)) in a separate object and expose that.
    // This preserves immutability and throws if you try to set deep properties.
    const readonlyMessageProxy = reactive({
        errors: {},
        messages: {},
    });

    /* v8 ignore start */
    // Allow controlled test manipulation
    if (import.meta.env.MODE === "test") {
        setupFieldPropsForTest(props, localFormContext);
    }
    /* v8 ignore end */

    const state = reactive(
        /** @type {FieldContextRawState} */
        {
            // *** Identification & Metadata ***
            name: readonly(toRef(props, "name")),
            formModelName: readonly(toRef(props, "formModelName")),
            clearServerErrorDependents: readonly(toRef(props, "clearServerErrorDependents")),
            validationDependencies: readonly(toRef(props, "validationDependencies")),
            readOnly: readonly(toRef(props, "readOnly")),

            // *** Validation & Display ***
            label: computed(() => (props.label?.length ? props.label : props.name)),
            required: computed(() => {
                const fc = unref(formContext);
                if (fc) {
                    return !!fc.state.required[props.name];
                }
                return !!amIRequired();
            }),
            valid: computed(() => {
                const fc = unref(formContext);
                const returnValue = fc ? fc.state.valid[props.name] : amIValid();
                if (!returnValue) {
                    return defaultValidationFailedMessage;
                }
                return returnValue;
            }),
            help: readonly(toRef(props, "help")),
            // todo: Replace this with a general field -> widget prop pass-through mechanism
            suffix: computed(() => props.rangeSuffix || ""),

            // *** Value Handling ***
            value: computed({
                get: () => {
                    const fc = unref(formContext);
                    return fc ? get(fc.state.values, props.name) : props.modelValue;
                },
                set: (newValue) => {
                    if (isEqual(newValue, state.value)) {
                        return;
                    }
                    const fc = unref(formContext);
                    if (fc) {
                        if (newValue === undefined) {
                            fc.deleteValue(state.name);
                        } else {
                            fc.updateValue(state.name, newValue);
                        }
                    } else {
                        if (props.modelValue !== newValue) {
                            emit("update:modelValue", newValue);
                        }
                    }
                },
            }),
            submittingValue: computed(() => {
                const fc = unref(formContext);
                if (fc) {
                    return get(fc.state.submittingValues, props.name);
                }
                if (localFormContext.ignored[state.name]) {
                    return undefined; // If entire field is ignored, exclude it
                }

                const rawValue = unref(state.value);

                // Handle arrays: Filter out ignored elements
                if (Array.isArray(rawValue)) {
                    return rawValue.filter((_, index) => !localFormContext.ignored[`${state.name}[${index}]`]);
                }

                // Handle nested objects: Remove ignored sub-properties
                if (typeof rawValue === "object" && rawValue !== null) {
                    return omit(cloneDeep(rawValue), Object.keys(localFormContext.ignored));
                }

                return rawValue;
            }),
            initialValue: computed({
                get: () => {
                    const fc = unref(formContext);
                    return fc ? get(fc.state.initialValues, props.name) : localFormContext.initialValue;
                },
                set: (newValue) => {
                    const fc = unref(formContext);
                    if (fc) {
                        if (isEqual(newValue, fc.state.initialValues[props.name])) {
                            return;
                        }
                        if (newValue === undefined) {
                            fc.deleteInitialValue(state.name);
                        } else {
                            fc.updateInitialValue(state.name, newValue);
                        }
                    } else {
                        if (isEqual(newValue, localFormContext.initialValue)) {
                            return;
                        }
                        if (newValue === undefined) {
                            delete localFormContext.initialValue;
                        } else {
                            localFormContext.initialValue = newValue;
                        }
                    }
                },
            }),
            // todo: Investigate why valueIsInitial uses submittingValue instead of value
            valueIsInitial: computed(() => isEqual(state.submittingValue, state.initialValue)),
            initialValueUnset: computed(() => isUnsetValue(state.initialValue)),
            valueUnset: computed(() => isUnsetValue(state.value)),
            valueRequiredViolation: computed(
                () =>
                    state.required &&
                    (props.isRequiredViolation
                        ? props.isRequiredViolation(state.value)
                        : defaultIsRequiredViolation(state.value)),
            ),

            // *** Messages & Errors ***
            messages: readonly(toRef(readonlyMessageProxy, "messages")),
            errors: readonly(toRef(readonlyMessageProxy, "errors")),

            // *** Interaction & State Tracking **
            touched: computed(() => {
                const fc = unref(formContext);
                return !!(fc ? fc.state.touched[props.name] : localFormContext.touched);
            }),
            modified: computed(() => {
                const fc = unref(formContext);
                return fc ? !!fc.state.modified[props.name] : amIModified();
            }),
            ignored: computed(() => {
                const fc = unref(formContext);
                return !!(fc ? fc.state.ignored[props.name] : localFormContext.ignored[state.name]);
            }),
            focused: computed(() => {
                const fc = unref(formContext);
                return fc ? fc.state.focused === props.name : localFormContext.focused;
            }),

            // *** Dependency Management ***
            dependencyValues: computed(() => {
                const fc = unref(formContext);
                // not sure that it makes sense to have non-form context dependencies
                return fc ? fc.state.dependencyValues[props.name] || {} : {};
            }),
        },
    );
    readonlyMessageProxy.errors = computed(() => {
        const fc = unref(formContext);
        return fc ? fc.state.errors[state.name] || {} : localFormContext.errors;
    });
    readonlyMessageProxy.messages = computed(() => {
        const fc = unref(formContext);
        return fc ? fc.state.messages[state.name] || {} : localFormContext.messages;
    });

    watch(
        [
            toRef(state, "required"),
            toRef(props, "requiredMessage"),
            toRef(state, "touched"),
            toRef(state, "valueRequiredViolation"),
        ],
        ([newRequired, newRequiredMessage, newTouched, newValueRequiredViolation]) => {
            const fc = unref(formContext);
            const desiredMessage = newRequiredMessage || defaultRequiredMessage;
            const hasViolation = newRequired && newTouched && newValueRequiredViolation;
            if (fc) {
                if (hasViolation) {
                    const existingRequired = fc.state.errors[props.name]?.required;
                    if (existingRequired !== desiredMessage) {
                        fc.updateError(props.name, "required", desiredMessage);
                    }
                } else {
                    fc.deleteError(props.name, "required");
                }
            } else {
                if (hasViolation) {
                    if (localFormContext.errors.required !== desiredMessage) {
                        localFormContext.errors.required = desiredMessage;
                    }
                } else {
                    if (localFormContext.errors.required) {
                        delete localFormContext.errors.required;
                    }
                }
            }
        },
        { immediate: true },
    );

    watch(
        toRef(state, "valid"),
        (newValue) => {
            const fc = unref(formContext);
            if (fc) {
                if (newValue && newValue !== true) {
                    const oldError = fc.state.errors[props.name]?.validate;
                    if (oldError !== newValue) {
                        fc.updateError(props.name, "validate", newValue);
                    }
                } else {
                    fc.deleteError(props.name, "validate");
                }
            } else {
                if (newValue && newValue !== true) {
                    if (localFormContext.errors.validate !== newValue) {
                        localFormContext.errors.validate = newValue;
                    }
                } else {
                    if (localFormContext.errors.validate) {
                        delete localFormContext.errors.validate;
                    }
                }
            }
        },
        // if immediate, validation failed may be triggered when partially initialized.
        // { immediate: true },
    );

    /** @type{FieldContext} */
    const returnObj = {
        state,
        // *** Value Management ***
        updateValue: (newValue) => {
            const fc = unref(formContext);
            if (fc) {
                fc.updateValue(state.name, newValue);
            } else {
                if (props.modelValue !== newValue) {
                    emit("update:modelValue", newValue);
                }
            }
        },
        deleteValue: () => {
            const fc = unref(formContext);
            if (fc) {
                fc.deleteValue(state.name);
            } else {
                if (props.modelValue !== undefined) {
                    emit("update:modelValue", undefined);
                }
            }
        },
        updateInitialValue: (newValue) => {
            const fc = unref(formContext);
            if (fc) {
                fc.updateInitialValue(state.name, newValue);
            } else {
                if (isEqual(newValue, localFormContext.initialValue)) {
                    return;
                }
                if (newValue === undefined) {
                    delete localFormContext.initialValue;
                } else {
                    localFormContext.initialValue = newValue;
                }
            }
        },
        deleteInitialValue: () => {
            const fc = unref(formContext);
            if (fc) {
                fc.deleteInitialValue(state.name);
            } else {
                if (localFormContext.initialValue) {
                    delete localFormContext.initialValue;
                }
            }
        },

        // *** Error Handling ***
        updateError: (code, errorMessage) => {
            validateNonReservedCode(code);
            const fc = unref(formContext);
            if (fc) {
                fc.updateError(state.name, code, errorMessage);
            } else {
                if (isEqual(errorMessage, localFormContext.errors[code])) {
                    return;
                }
                if (errorMessage === undefined) {
                    delete localFormContext.errors[code];
                } else {
                    localFormContext.errors[code] = errorMessage;
                }
            }
        },
        deleteError: (code) => {
            const fc = unref(formContext);
            if (fc) {
                fc.deleteError(state.name, code);
            } else {
                if (code in localFormContext.errors) {
                    delete localFormContext.errors[code];
                }
            }
        },
        clearErrors: (childIndex) => {
            const fc = unref(formContext);
            if (fc) {
                fc.clearErrors(state.name, childIndex);
            } else {
                assignReactiveObject(localFormContext.errors, {});
            }
        },

        // *** Messages ***
        updateMessage: (code, message) => {
            validateNonReservedCode(code);
            const fc = unref(formContext);
            if (fc) {
                fc.updateMessage(state.name, code, message);
            } else {
                if (isEqual(message, localFormContext.messages[code])) {
                    return;
                }
                if (message === undefined) {
                    delete localFormContext.messages[code];
                } else {
                    localFormContext.messages[code] = message;
                }
            }
        },
        deleteMessage: (code) => {
            const fc = unref(formContext);
            if (fc) {
                fc.deleteMessage(state.name, code);
            } else {
                if (code in localFormContext.messages) {
                    delete localFormContext.messages[code];
                }
            }
        },
        clearMessages: (childIndex) => {
            const fc = unref(formContext);
            if (fc) {
                fc.clearMessages(state.name, childIndex);
            } else {
                assignReactiveObject(localFormContext.messages, {});
            }
        },

        // *** Field Interactions ***
        setTouched: () => {
            const fc = unref(formContext);
            if (fc) {
                fc.setTouched(state.name);
            } else {
                localFormContext.touched = true;
            }
        },
        clearTouched: () => {
            const fc = unref(formContext);
            if (fc) {
                fc.clearTouched(state.name);
            } else {
                localFormContext.touched = false;
            }
        },
        focus: () => {
            const fc = unref(formContext);
            if (fc) {
                fc.focus(state.name);
            } else {
                localFormContext.focused = true;
            }
        },
        blur: () => {
            const fc = unref(formContext);
            if (fc) {
                fc.blur(state.name);
                fc.clearServerErrors(state.name, state.clearServerErrorDependents);
            } else {
                localFormContext.focused = false;
            }
        },

        // *** Field Ignoring ***
        ignore: (name) => {
            const fc = unref(formContext);
            const localName = name || state.name;
            if (fc) {
                fc.ignore(localName);
            } else {
                if (!localFormContext.ignored[localName]) {
                    localFormContext.ignored[localName] = true;
                }
            }
        },
        removeIgnore: (name) => {
            const fc = unref(formContext);
            const localName = name || state.name;
            if (fc) {
                fc.removeIgnore(localName);
            } else {
                if (localFormContext.ignored[localName]) {
                    delete localFormContext.ignored[localName];
                }
            }
        },

        // *** Hook Registration ***
        registerIsModifiedHook: (hook) => {
            const fc = unref(formContext);
            if (fc) {
                return fc.registerIsModifiedHook(state.name, hook);
            }
        },
        unregisterIsModifiedHook: (id) => {
            const fc = unref(formContext);
            if (fc) {
                return fc.unregisterIsModifiedHook(id);
            }
        },
        registerIsRequiredHook: (hook) => {
            const fc = unref(formContext);
            if (fc) {
                return fc.registerIsRequiredHook(state.name, hook);
            }
        },
        unregisterIsRequiredHook: (id) => {
            const fc = unref(formContext);
            if (fc) {
                return fc.unregisterIsRequiredHook(id);
            }
        },
        registerIsValidHook: (hook) => {
            const fc = unref(formContext);
            if (fc) {
                return fc.registerIsValidHook(state.name, hook);
            }
        },
        unregisterIsValidHook: (id) => {
            const fc = unref(formContext);
            if (fc) {
                return fc.unregisterIsValidHook(id);
            }
        },

        registerDependencyValues: (dependencies) => {
            const fc = unref(formContext);
            if (fc) {
                return unref(formContext).registerDependencyValues(toRef(state, "name"), dependencies);
            }
        },
        unregisterDependencyValues: (id) => {
            if (unref(formContext)) {
                unref(formContext).unregisterDependencyValues(id);
            }
        },
    };

    provide(FieldContextSymbol, returnObj);

    let isModifiedHookId;
    if (unref(formContext)) {
        isModifiedHookId = returnObj.registerIsModifiedHook(amIModified);
    }
    onUnmounted(() => {
        if (isModifiedHookId) {
            returnObj.unregisterIsModifiedHook(isModifiedHookId);
        }
    });
    let isRequiredHookId;
    if (unref(formContext)) {
        isRequiredHookId = returnObj.registerIsRequiredHook(amIRequired);
    }
    onUnmounted(() => {
        if (isRequiredHookId) {
            returnObj.unregisterIsRequiredHook(isRequiredHookId);
        }
    });
    let isValidHookId;
    if (unref(formContext)) {
        isValidHookId = returnObj.registerIsValidHook(amIValid);
    }
    onUnmounted(() => {
        if (isValidHookId) {
            returnObj.unregisterIsValidHook(isValidHookId);
        }
    });
    let dependencyValuesId;
    if (unref(formContext)) {
        dependencyValuesId = unref(formContext).registerDependencyValues(
            toRef(state, "name"),
            toRef(state, "validationDependencies"),
        );
    }
    onUnmounted(() => {
        if (dependencyValuesId) {
            unref(formContext).unregisterDependencyValues(dependencyValuesId);
        }
    });
    return returnObj;
}
