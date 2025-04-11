import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import isString from "lodash-es/isString.js";
import omit from "lodash-es/omit.js";
import { computed, inject, onUnmounted, provide, reactive, readonly, toRef, unref, watch } from "vue";
import { deepUnref } from "vue-deepunref";

export const FIELD_PROPS = {
    // *** Identification & Metadata ***
    name: { type: String, required: true },
    formModelName: { type: String, default: undefined },
    /* v8 ignore next 2 */
    clearServerErrorDependents: { type: Array, default: () => [] },
    validationDependencies: { type: Array, default: () => [] },
    readOnly: { type: Boolean, default: false },

    // *** Validation ***
    required: { type: Boolean, default: null },
    requiredMessage: { type: String, default: "This field is required." },
    shouldRequireFn: { type: Function, default: null },
    isRequiredViolation: { type: Function, default: null },
    validate: { type: Function, default: null },

    // *** Display ***
    label: { type: String, default: null },
    help: { type: String, default: "" },

    // *** Value Handling ***
    modelValue: { type: [String, Number, Boolean, Array, Object], default: undefined },
    preprocessSet: { type: Function, default: null },
    preprocessGet: { type: Function, default: null },

    // *** Form Context Behavior ***
    contextless: { type: Boolean, default: false },
};

export const FIELD_EMITS = ["update:modelValue"];

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
 * @property {import('vue').ComputedRef<{[code: string]: string}>} messages - The messages for the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} errors - The errors for the field.
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
 * @property {() => void} deleteValue - Deletes the field's value, resetting it.
 *
 * // *** Error Handling ***
 * @property {(code: string, message: string) => void} updateError - Updates the error message for a given code.
 * @property {(code: string) => void} deleteError - Removes a specific error by code.
 * @property {(childIndex:number[]|undefined) => void} clearErrors - Clears all errors associated with this field.
 *
 * // *** Message Handling ***
 * @property {(code: string, message: string) => void} updateMessage - Updates a specific message.
 * @property {(code: string) => void} deleteMessage - Removes a message by code.
 * @property {(childIndex:number[]|undefined) => void} clearMessages - Clears all messages.
 *
 * // *** Field Interactions ***
 * @property {() => void} setTouched - Marks the field as "touched" (e.g., user clicked away).
 * @property {() => void} clearTouched - Clears the touched state of the field, making it "untouched."
 * @property {() => void} focus - Focuses on the field (usually for accessibility or validation).
 * @property {() => void} blur - Blurs (un-focuses) the field.
 *
 * // *** Field Ignoring ***
 * @property {(name:string[]|undefined) => void} ignore - Marks the field as ignored, so validation does not apply.
 * @property {(name:string[]|undefined) => void} removeIgnore - Removes the ignore status, making the field active again.
 *
 * // *** Hook Registration ***
 * @property {(hook: () => boolean) => string} registerIsModifiedHook - Registers a hook that determines if the field is modified.
 * @property {(id: string) => void} unregisterIsModifiedHook - Unregisters a previously registered modified-state hook.
 * @property {(hook: () => boolean) => string} registerIsRequiredHook - Registers a hook that determines if the field is required.
 * @property {(id: string) => void} unregisterIsRequiredHook - Unregisters a previously registered required-state hook.
 * @property {(hook: () => boolean | string) => string} registerIsValidHook - Registers a hook that determines if the field is valid.
 * @property {(id: string) => void} unregisterIsValidHook - Unregisters a previously registered validation-state hook.
 */

/**
 * The non-reactive `functions` that can be passed to useField.
 *
 * @typedef {object} FieldContextFunctions
 * @property {(value: any) => any} [preprocessSet] - A custom function to preprocess the value before updating
 * @property {(value: any) => any} [preprocessGet] - A custom function to preprocess the value before retrieving
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
 * @property {(value: any) => any} [preprocessSet=null] - A custom function to preprocess the value before updating.
 * @property {(value: any) => any} [preprocessGet=null] - A custom function to preprocess the value before retrieving.
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

/**
 * Generate and provide a field context for a field.
 *
 * @param {FieldContextProps} props - The field context's reactive props.
 * @param {import('vue').EmitFn} emit - The component emit function.
 * @param {FieldContextFunctions} [functions] - Additional non-reactive functions.
 * @returns {FieldContext} The field context object.
 */
export function useField(props, emit /*, functions*/) {
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
    // Message cache workaround:
    // - Ensures `errors` & `messages` are readonly, sourced from either the formContext or local state.
    // - Defaults to an empty object when missing in formContext.
    // - Avoids making `state` fully readonly, since it contains writable computed properties.
    const messageCache = reactive({});

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
            initialValue: computed(() => {
                const fc = unref(formContext);
                return fc ? get(fc.state.initialValues, props.name) : localFormContext.initialValue;
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
            messages: readonly(toRef(messageCache, "messages")),
            errors: readonly(toRef(messageCache, "errors")),

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
                let fcValues = {};
                if (fc) {
                    fcValues = fc.state.values;
                }
                const returnValue = {};
                for (const dep of state.validationDependencies) {
                    let resolvedPath = dep;
                    if (resolvedPath.startsWith("$parent")) {
                        // drop the last segment to get parent path.
                        const parentPath = state.name.split(".").slice(0, -1).join(".");
                        resolvedPath = resolvedPath.replace("$parent", parentPath);
                    }
                    const value = get(fcValues, resolvedPath);
                    if (value !== undefined) {
                        returnValue[dep] = value;
                    }
                }
                return Object.keys(returnValue).length ? returnValue : undefined;
            }),
        },
    );
    messageCache.errors = computed(() => {
        const fc = unref(formContext);
        return fc ? fc.state.errors[state.name] || {} : localFormContext.errors;
    });
    messageCache.messages = computed(() => {
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

        // *** Error Handling ***
        updateError: (code, errorMessage) => {
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
    return returnObj;
}
