import { keyDiff } from "@arrai-innovations/reactive-helpers";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import isString from "lodash-es/isString.js";
import { computed, inject, onUnmounted, provide, reactive, readonly, toRef, unref, watch } from "vue";
import { deepUnref } from "vue-deepunref";

/**
 * The reactive props we expect fields to receive and pass to useField when creating a field context.
 *
 * @typedef {object} FIELD_PROPS
 * @property {string} name - The name of the field.
 * @property {boolean} [required=false] - Whether the field is required.
 * @property {string} [requiredMessage="This field is required."] - The message to display if the field is required and empty.
 * @property {string} [label] - The label for the field.
 * @property {string} [help] - The help text for the field.
 * @property {any} [modelValue] - The field value. This is used when the field is not part of a form.
 * @property {(value: any) => boolean} [validate] - A custom validation function for the field.
 * @property {(value: any) => any} [preprocessSet] - A custom function to preprocess the value before updating
 * @property {(value: any) => any} [preprocessGet] - A custom function to preprocess the value before retrieving
 */
export const FIELD_PROPS = {
    name: {
        type: String,
        required: true,
    },
    required: {
        type: Boolean,
        default: false,
    },
    readOnly: {
        type: Boolean,
        default: false,
    },
    requiredMessage: {
        type: String,
        default: "This field is required.",
    },
    label: {
        type: String,
        default: null,
    },
    help: {
        type: String,
        default: null,
    },
    validate: {
        type: Function,
        default: null,
    },
    requiredFn: {
        type: Function,
        default: null,
    },
    modelValue: {
        type: [String, Number, Boolean, Array, Object],
        default: undefined,
    },
    dependents: {
        type: Array,
        default: () => [],
    },
    dependencies: {
        type: Array,
        default: () => [],
    },
    formModelName: {
        type: String,
        default: undefined,
    },
    preprocessGet: {
        type: Function,
        default: null,
    },
    preprocessSet: {
        type: Function,
        default: null,
    },
};

export const FIELD_EMITS = ["update:modelValue"];

/**
 * The default required validation function.
 *
 * @param {any} value - The value to validate.
 * @returns {boolean} Whether the value is not null, undefined, an empty string, false, or 0.
 */
export function defaultValidateRequired(value) {
    return value !== null && value !== undefined && value !== "" && value !== false && value !== 0;
}

/**
 * Resolves a `$parent` reference in a field path based on the current field name.
 * @private
 * @param {string} fieldPath - The field path (which may include `$parent`).
 * @param {string} currentFieldPath - The current field's full path.
 * @returns {string} The resolved field path.
 */
const resolveParentPath = (fieldPath, currentFieldPath) => {
    if (!fieldPath.includes("$parent")) {
        return fieldPath; // No need to resolve if `$parent` is not used
    }

    const parentPath = currentFieldPath.split(".").slice(0, -1).join("."); // Extract the parent path
    return fieldPath.replace("$parent", parentPath);
};

/**
 * @typedef {object} FieldContextRawState
 * @property {import('vue').ComputedRef<string>} name - The name of the field. This is the path to look up the value of
 *  the field in the form context.
 * @property {import('vue').ComputedRef<string>} formModelName - The name of the form model. This is the lookup name
 *  for configuration in a FormModel configuration object related to the field.
 * @property {import('vue').ComputedRef<string>} dependents - The dependents for the field.
 * @property {import('vue').ComputedRef<string>} readOnly - Whether the field is read only.
 * @property {import('vue').ComputedRef<string>} label - The label for the field.
 * @property {import('vue').ComputedRef<boolean|undefined>} required - Whether the field is required.
 * @property {import('vue').ComputedRef<string>} help - The help text for the field.
 * @property {import('vue').ComputedRef<string>} suffix - The suffix for the field.
 * @property {import('vue').WritableComputedRef<any>} value - The current value of the field.
 * @property {import('vue').WritableComputedRef<any>} valueDetail - The current detail value object of the field.
 * @property {import('vue').WritableComputedRef<any>} submittingValue -The current value of the field whilte accounting for ignored fields.
 * @property {import('vue').ComputedRef<any>} initialValue - The initial value of the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} messages - The messages for the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} errors - The errors for the field.
 * @property {import('vue').ComputedRef<boolean>} modified - Whether the field has been modified.
 * @property {import('vue').ComputedRef<boolean>} touched - Whether the field has been touched.
 * @property {import('vue').ComputedRef<boolean>} ignored - Whether the field has been ignored.
 * @property {import('vue').ComputedRef<boolean>} focused - Whether the field is focused.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FieldContextRawState>} FieldContextState
 */

/**
 * The field context object, providing reactive properties and methods to update the field's value, errors, messages,
 *  touched state, modified state, and to focus or blur it.
 *
 * @typedef {object} FieldContext
 * @property {FieldContextState} state - The reactive state of the field.
 * @property {(value: any) => void} updateValue - Update the field's value.
 * @property {(value: any) => void} updateInitialValue - Update the field's initial value.
 * @property {() => void} deleteValue - Delete the field's value.
 * @property {(code: string, message: string) => void} updateError - Update the field's error.
 * @property {([childIndex:number|undefined]) => void} clearErrors - Clear the field's error.
 * @property {(code: string) => void} deleteError - Delete the field's error.
 * @property {([childIndex:number|undefined]) => void} clearMessages - Clear the field's messages.
 * @property {(code: string, message: string) => void} updateMessage - Update the field's message.
 * @property {(code: string) => void} deleteMessage - Delete the field's message.
 * @property {() => void} setTouched - Mark the field as touched. The form context object marks blurred
 *  fields as touched automatically.
 * @property {() => void} focus - Focus on the field.
 * @property {() => void} blur - Blur the field.
 * @property {([name:string|undefined]) => void} ignore - Ignore the field.
 * @property {([]name:string|undefined]) => void} removeIgnore - Remove ignoring the field.
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
 * @property {string} name - The name of the field.
 * @property {boolean} [required=false] - Whether the field is required.
 * @property {boolean} [readOnly=false] - Whether the field is read only.
 * @property {string} [requiredMessage="This field is required."] - The message to display if the field is required and empty.
 * @property {string} [label] - The label for the field.
 * @property {string} [help] - The help text for the field.
 * @property {(value: any, dependencies: {[path: string]: [value: any]}|undefined) => boolean} [validate] - A custom
 *  validation function for the field. This function should return `true` when the field is valid. Otherwise, it should
 *  return a string with the desired error message.
 * @property {(value: any, dependencies: {[path: string]: [value: any]}|undefined) => boolean} [requiredFn] - A custom
 *  function to check if the field is required. This function should return `true` when a required message should be
 *  shown.
 * @property {any} [modelValue] - The field value. This is used when the field is not part of a form.
 * @property {string[]} [dependents] - The dependents for the field.
 * @property {string[]} [dependencies] - The dependencies for the field.
 * @property {string} [formModelName] - The name of the form model. This is the lookup name for configuration in a FormModel configuration object related to the field.
 * @property {(value: any) => any} [preprocessSet] - A custom function to preprocess the value before updating
 * @property {(value: any) => any} [preprocessGet] - A custom function to preprocess the value before retrieving
 */

/**
 * The reactive arguments for the useField function. (Matches FIELD_PROPS).
 *
 * @typedef {import('vue').UnwrapNestedRefs<{
 *     name: string,
 *     required: boolean,
 *     requiredMessage: string,
 *     label: string,
 *     help: string,
 *     validate: (value: any, dependencies:any) => boolean,
 *     requiredFn: (value: any, dependencies: any) => boolean,
 * }>} FieldContextProps
 */

const returnVoid = () => {};

/**
 * Determines if a value should be considered "empty" in the context of form field modification.
 *
 * This function treats `undefined`, `null`, and `""` (empty string) as equivalent empty values.
 * Unlike Lodash's `isEmpty`, it **does not** consider `false`, `0`, empty arrays `[]`, or empty objects `{}`
 * as empty values, because:
 *
 * - `false` and `0` are **valid form values** and should not be ignored.
 * - Empty arrays `[]` and objects `{}` may be intentional values and should not trigger "empty" logic.
 *
 * | Input               | Description                    | Expected Output |
 * |---------------------|--------------------------------|-----------------|
 * | `undefined`         | Explicitly undefined value     | ✅ `true`       |
 * | `null`              | Null value                     | ✅ `true`       |
 * | `""` (empty string) | Empty string                   | ✅ `true`       |
 * | `false`             | Boolean false                  | ❌ `false`      |
 * | `0`                 | Numeric zero                   | ❌ `false`      |
 * | `[]` (empty array)  | Empty array                    | ❌ `false`      |
 * | `{}` (empty object) | Empty object                   | ❌ `false`      |
 * | `"hello"`           | Non-empty string               | ❌ `false`      |
 * | `42`                | Non-zero number                | ❌ `false`      |
 * | `[1, 2, 3]`         | Non-empty array                | ❌ `false`      |
 * | `{ key: "value" }`  | Object with properties         | ❌ `false`      |
 *
 * @param {any} val - The value to check.
 * @returns {boolean} `true` if the value is `undefined`, `null`, or an empty string, otherwise `false`.
 */
const isEmpty = (val) => val === undefined || val === null || val === "";

const defaultRequiredMessage = "This field is required.";
const defaultValidationFailedMessage = "Validation Failed";

/**
 * Generate and provide a field context for a field, using the provided props and functions, including methods to update
 *  the field's value, errors, messages, touched state, modified state, and to focus or blur it.
 *
 * @param {FieldContextProps} props - The field context's reactive props.
 * @param {import('vue').EmitFn} emit - The field context's component emit function.
 * @param {FieldContextFunctions} [functions] - The field context's non-reactive functions.
 * @returns {FieldContext} The field context object.
 */
export function useField(props, emit, functions) {
    /** @type {import('@vueda/use/useForm.js').FormContext|null} */
    const formContext = inject(FormContextSymbol, null);
    const amIModified = () => {
        return !state.valueIsInitial && !state.ignored && !(state.initialValueEmpty && state.valueEmpty);
    };
    const amIRequired = () => {
        let required = props.required;
        if (required === undefined && props.requiredFn) {
            const requiredFn = props.requiredFn;
            required = !requiredFn(cloneDeep(unref(state.value)), cloneDeep(deepUnref(state.dependencyValues)));
        }
        return required && !state.readOnly && !state.ignored;
    };
    const amIValid = () => {
        if (!state.touched || !props.validate) {
            return true;
        }
        const result = props.validate(cloneDeep(unref(state.value)), cloneDeep(deepUnref(state.dependencyValues)));
        return result === true ? true : isString(result) ? result : defaultValidationFailedMessage;
    };

    const state = reactive({
        name: readonly(toRef(props, "name")),
        formModelName: readonly(toRef(props, "formModelName")),
        dependents: readonly(toRef(props, "dependents")),
        dependencies: readonly(toRef(props, "dependencies")),
        readOnly: readonly(toRef(props, "readOnly")),
        label: computed(() => (props.label?.length ? props.label : props.name)),
        required: formContext ? computed(() => formContext.state.required[props.name]) : computed(amIRequired),
        valid: formContext ? computed(() => formContext.state.valid[props.name]) : computed(amIValid),
        help: computed(() => props.help || ""),
        suffix: computed(() => props.rangeSuffix || ""),
        valueDetail: formContext
            ? computed({
                  get: () => {
                      return get(formContext.state.valueDetails, props.name);
                  },
                  set: (newValue) => {
                      if (isEqual(newValue, state.valueDetail)) {
                          return;
                      }
                      if (newValue === undefined) {
                          formContext.deleteValueDetails(state.name);
                      } else {
                          formContext.updateValueDetails(state.name, newValue);
                      }
                  },
              })
            : undefined,
        submittingValue: formContext
            ? computed(() => {
                  let value = get(formContext.state.submittingValues, props.name);
                  value = functions?.preprocessGet ? functions.preprocessGet(value) : value;
                  return props.preprocessGet ? props.preprocessGet(value) : value;
              })
            : undefined,
        value:
            formContext || props.modelValue !== undefined
                ? computed({
                      get: () => {
                          let value =
                              props.modelValue !== undefined
                                  ? props.modelValue
                                  : get(formContext.state.values, props.name);
                          value = functions?.preprocessGet ? functions.preprocessGet(value) : value;
                          value = props.preprocessGet ? props.preprocessGet(value) : value;
                          if (props.modelValue !== undefined && (functions?.preprocessGet || props.preprocessGet)) {
                              emit("update:modelValue", value);
                          }
                          return value;
                      },
                      set: (newValue) => {
                          if (isEqual(newValue, state.value)) {
                              return;
                          }
                          if (functions?.preprocessSet) {
                              newValue = functions.preprocessSet(newValue);
                          }
                          if (isEqual(newValue, state.value)) {
                              // only you can prevent over reactivity
                              return;
                          }
                          if (props.preprocessSet) {
                              newValue = props.preprocessSet(newValue);
                          }
                          if (newValue === undefined) {
                              if (formContext) {
                                  formContext.deleteValue(state.name);
                              }
                              emit("update:modelValue", undefined);
                          } else {
                              if (formContext) {
                                  formContext.updateValue(state.name, newValue);
                              }
                              emit("update:modelValue", newValue);
                          }
                      },
                  })
                : undefined,
        initialValue: formContext
            ? computed({
                  get: () => {
                      let value = get(formContext.state.initialValues, props.name);
                      value = functions?.preprocessGet ? functions.preprocessGet(value) : value;
                      value = props.preprocessGet ? props.preprocessGet(value) : value;
                      return value;
                  },
                  set: (newValue) => {
                      if (isEqual(newValue, state.valueDetail)) {
                          return;
                      }
                      formContext.updateInitialValue(state.name, newValue);
                  },
              })
            : undefined,
        valueIsInitial: computed(() => isEqual(state.submittingValue, state.initialValue)),
        initialValueEmpty: computed(() => isEmpty(state.initialValue)),
        valueEmpty: computed(() => isEmpty(state.value)),
        messages: formContext ? computed(() => get(formContext.state.messages, props.name)) : {},
        errors: formContext ? computed(() => get(formContext.state.errors, props.name)) : {},
        touched: formContext ? computed(() => formContext.state.touched[props.name]) : false,
        modified: formContext ? computed(() => formContext.state.modified[props.name]) : false,
        ignored: formContext ? computed(() => formContext.state.ignored[props.name]) : false,
        focused: formContext ? computed(() => formContext.state.focused === props.name) : false,
        dependencyValues: formContext
            ? computed(() => {
                  const valueDetails = {};
                  state.dependencies.forEach((dependency) => {
                      let field = dependency;
                      if (dependency.includes("$parent") && state.name.includes(".")) {
                          const parent = state.name.split(".")[0];
                          field = dependency.split(".")[1];
                          dependency = dependency.replace("$parent", parent);
                      }
                      const value =
                          get(formContext.state.valueDetails, dependency) ?? get(formContext.state.values, dependency);
                      if (value !== undefined) {
                          valueDetails[field] = value;
                      }
                  });
                  return Object.keys(valueDetails).length ? valueDetails : undefined;
              })
            : undefined,
    });

    watch(
        [toRef(state, "required"), toRef(props, "requiredMessage"), toRef(state, "touched"), toRef(state, "value")],
        ([newRequired, newRequiredMessage, newTouched, newValue]) => {
            if (formContext && newTouched) {
                const existingRequired = formContext.state.errors[props.name]?.required;
                const desiredMessage = newRequiredMessage || defaultRequiredMessage;
                if (newRequired && !defaultValidateRequired(newValue) && existingRequired !== desiredMessage) {
                    formContext.updateError(props.name, "required", desiredMessage);
                } else {
                    formContext.deleteError(props.name, "required");
                }
            }
        },
        {
            immediate: true,
        },
    );

    watch(
        toRef(state, "valid"),
        (newValue) => {
            if (formContext) {
                if (newValue !== true) {
                    const oldError = formContext.state.errors[props.name]?.validate;
                    if (oldError !== newValue) {
                        formContext.updateError(props.name, "validate", newValue);
                    }
                } else {
                    formContext.deleteError(props.name, "validate");
                }
            }
        },
        {
            immediate: true,
        },
    );

    const ifFormContext = (fn) => {
        if (formContext) {
            return fn;
        }
        return returnVoid;
    };
    const returnObj = {
        state,
        clearErrors: ifFormContext((childIndex = undefined) => formContext.clearErrors(state.name, childIndex)),
        updateError: ifFormContext((code, message) => formContext.updateError(state.name, code, message)),
        updateInitialValue: ifFormContext((value) => formContext.updateInitialValue(state.name, value)),
        deleteError: ifFormContext((code) => formContext.deleteError(state.name, code)),
        clearMessages: ifFormContext((childIndex = undefined) => formContext.clearMessages(state.name, childIndex)),
        updateMessage: ifFormContext((code, message) => formContext.updateMessage(state.name, code, message)),
        deleteMessage: ifFormContext((code) => formContext.deleteMessage(state.name, code)),
        setTouched: ifFormContext(() => formContext.setTouched(state.name)),
        clearTouched: ifFormContext(() => formContext.clearTouched(state.name)),
        focus: ifFormContext(() => formContext.focus(state.name)),
        blur: ifFormContext(() => formContext.blur(state.name, state.dependents)),
        ignore: ifFormContext((name = state.name) => formContext.ignore(name)),
        removeIgnore: ifFormContext((name = state.name) => formContext.removeIgnore(name)),
        deleteValue: ifFormContext(() => formContext.deleteValue(state.name)),
        registerIsModifiedHook: ifFormContext((hook) => formContext.registerIsModifiedHook(state.name, hook)),
        unregisterIsModifiedHook: ifFormContext((id) => formContext.unregisterIsModifiedHook(id)),
        registerIsRequiredHook: ifFormContext((hook) => formContext.registerIsRequiredHook(state.name, hook)),
        unregisterIsRequiredHook: ifFormContext((id) => formContext.unregisterIsRequiredHook(id)),
        registerIsValidHook: ifFormContext((hook) => formContext.registerIsValidHook(state.name, hook)),
        unregisterIsValidHook: ifFormContext((id) => formContext.unregisterIsValidHook(id)),
    };
    provide(FieldContextSymbol, returnObj);
    let isModifiedHookId;
    const registeredDependentIdsByDependent = {};
    if (formContext) {
        isModifiedHookId = returnObj.registerIsModifiedHook(amIModified);
    }
    onUnmounted(() => {
        if (isModifiedHookId) {
            returnObj.unregisterIsModifiedHook(isModifiedHookId);
        }
    });
    watch(
        () => cloneDeep(state.dependents),
        (newValue, oldValue) => {
            const { addedKeys, removedKeys } = keyDiff(newValue, oldValue);
            for (const dependent of addedKeys) {
                const resolvedDependent = resolveParentPath(dependent, state.name);
                registeredDependentIdsByDependent[resolvedDependent] = returnObj.registerIsModifiedHook(amIModified);
            }
            for (const dependent of removedKeys) {
                returnObj.unregisterIsModifiedHook(registeredDependentIdsByDependent[dependent]);
                delete registeredDependentIdsByDependent[dependent];
            }
        },
        {
            immediate: true,
        },
    );
    let isRequiredHookId;
    if (formContext) {
        isRequiredHookId = returnObj.registerIsRequiredHook(amIRequired);
    }
    onUnmounted(() => {
        if (isRequiredHookId) {
            returnObj.unregisterIsRequiredHook(isRequiredHookId);
        }
    });
    let isValidHookId;
    if (formContext) {
        isValidHookId = returnObj.registerIsValidHook(amIValid);
    }
    onUnmounted(() => {
        if (isValidHookId) {
            returnObj.unregisterIsValidHook(isValidHookId);
        }
    });
    return returnObj;
}
