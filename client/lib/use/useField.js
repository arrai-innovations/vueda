import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, inject, onBeforeUnmount, provide, reactive, readonly, toRef, unref, watch } from "vue";

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
 * The lifecycle hook that is called to ensure any error or message associated with field is cleared.
 * This ensures that when different fields are rendered for the same form field (e.g., the filter value on a filter form),
 * we need to manually clear any associated errors, messages, or values. This is necessary because the same field context is being reused.
 * @param {FieldContext} fieldContext
 */
export function onBeforeFieldUnmount(fieldContext) {
    return onBeforeUnmount(() => {
        fieldContext.deleteError(undefined);
        fieldContext.deleteMessage(undefined);
        //  this was here because the filter form was using the same field component for different filters.
        // needed to clean up the values each time switch filter
        // fieldContext.deleteValue();
    });
}
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
 * @property {() => void} deleteValue - Delete the field's value.
 * @property {(code: string, message: string) => void} updateError - Update the field's error.
 * @property {(code: string) => void} deleteError - Delete the field's error.
 * @property {(code: string, message: string) => void} updateMessage - Update the field's message.
 * @property {(code: string) => void} deleteMessage - Delete the field's message.
 * @property {() => void} calculateModified - Calculate the modified state of the field. The form context object
 *  calculates modified fields automatically when values change via form methods.
 * @property {() => void} setTouched - Mark the field as touched. The form context object marks blurred
 *  fields as touched automatically.
 * @property {() => void} focus - Focus on the field.
 * @property {() => void} blur - Blur the field.
 * @property {([name:string|undefined]) => void} ignore - Ignore the field.
 * @property {([]name:string|undefined]) => void} removeIgnore - Remove ignoring the field.
 * @property {() => void} setModified - mark a field as modified.
 * @property {() => void} clearModified - clear modified mark of a field.
 */

/**
 * The non-reactive `functions` that can be passed to useField.
 *
 * @typedef {object} FieldContextFunctions
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
 *     validate: (value: any,name:any) => boolean,
 *     requiredFn: (value: any, name: any) => boolean,
 * }>} FieldContextProps
 */

const returnVoid = () => {};

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
    const requiredFn = computed(() => props.requiredFn || defaultValidateRequired);
    const requiredMessage = computed(() => {
        return props.requiredMessage || "This field is required.";
    });
    const state = reactive({
        name: readonly(toRef(props, "name")),
        formModelName: readonly(toRef(props, "formModelName")),
        dependents: readonly(toRef(props, "dependents")),
        dependencies: readonly(toRef(props, "dependencies")),
        readOnly: readonly(toRef(props, "readOnly")),
        label: computed(() => (props.label?.length ? props.label : props.name)),
        required: computed(() => props.required ?? false),
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

        value:
            formContext || props.modelValue !== undefined
                ? computed({
                      get: () => {
                          const value =
                              props.modelValue !== undefined
                                  ? props.modelValue
                                  : get(formContext.state.values, props.name);
                          const returningValue = functions?.preprocessGet ? functions.preprocessGet(value) : value;
                          if (props.modelValue !== undefined && functions?.preprocessGet) {
                              emit("update:modelValue", returningValue);
                          }
                          return returningValue;
                      },
                      set: (newValue) => {
                          if (isEqual(newValue, state.value)) {
                              return;
                          }
                          if (functions?.preprocessSet) {
                              newValue = functions.preprocessSet(newValue);
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
        initialValue: formContext ? computed(() => get(formContext.state.initialValues, props.name)) : undefined,
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
    const checkRequired = () => {
        if ((props.required || props.requiredFn) && state.touched && formContext && !state.readOnly) {
            if (!unref(requiredFn)(state.value, state.dependencyValues) || state.ignored) {
                formContext.updateError(props.name, "required", requiredMessage.value);
            } else {
                formContext.deleteError(props.name, "required");
            }
        }
    };

    const checkCustomValidation = () => {
        if (props.validate && state.touched && formContext) {
            const result = props.validate(state.value, state.dependencyValues);
            if (result === true) {
                formContext.deleteError(props.name, "validate");
            } else {
                formContext.updateError(props.name, "validate", result);
            }
        }
    };

    watch(
        () => cloneDeep(state.value),
        (newValue, oldValue) => {
            if (!isEqual(newValue, oldValue)) {
                if (formContext) {
                    formContext.calculateModified(props.name, props.dependents);
                }
                checkRequired();
                checkCustomValidation();
            }
        },
        { deep: true },
    );

    watch(
        () => state.dependencyValues,
        (newValue, oldValue) => {
            if (!isEqual(newValue, oldValue)) {
                checkRequired();
                checkCustomValidation();
            }
        },
        { deep: true, immediate: true },
    );

    watch(
        [
            toRef(props, "required"),
            toRef(props, "requiredMessage"),
            toRef(props, "validate"),
            requiredFn,
            toRef(state, "touched"),
            toRef(state, "modified"),
            toRef(state, "ignored"),
        ],
        (
            [newRequired, newRequiredMessage, newValidate, newRequiredFn, newTouched, newModified, newIgnored],
            [oldRequired, oldRequiredMessage, oldValidate, oldRequiredfn, oldTouched, oldModified, oldIgnored],
        ) => {
            const requiredChanged = newRequired !== oldRequired;
            const requiredMessageChanged = newRequiredMessage !== oldRequiredMessage;
            const validateChanged = newValidate !== oldValidate;
            const requiredFnChanged = newRequiredFn !== oldRequiredfn;
            const touchedChanged = newTouched !== oldTouched;
            const modifiedChanged = newModified !== oldModified;
            const ignoredChanged = newIgnored !== oldIgnored;
            if (
                requiredChanged ||
                requiredMessageChanged ||
                touchedChanged ||
                modifiedChanged ||
                requiredFnChanged ||
                ignoredChanged
            ) {
                checkRequired();
            }
            if (validateChanged || touchedChanged || modifiedChanged) {
                checkCustomValidation();
            }
        },
        { immediate: true },
    );

    const ifFormContext = (fn) => {
        if (formContext) {
            return fn;
        }
        return returnVoid;
    };
    const returnObj = {
        state,
        updateError: ifFormContext((code, message) => formContext.updateError(state.name, code, message)),
        deleteError: ifFormContext((code) => formContext.deleteError(state.name, code)),
        updateMessage: ifFormContext((code, message) => formContext.updateMessage(state.name, code, message)),
        deleteMessage: ifFormContext((code) => formContext.deleteMessage(state.name, code)),
        calculateModified: ifFormContext(() => formContext.calculateModified(state.name)),
        setTouched: ifFormContext(() => formContext.setTouched(state.name)),
        clearTouched: ifFormContext(() => formContext.clearTouched(state.name)),
        focus: ifFormContext(() => formContext.focus(state.name)),
        blur: ifFormContext(() => formContext.blur(state.name, state.dependents)),
        ignore: ifFormContext((name = state.name) => formContext.ignore(name)),
        removeIgnore: ifFormContext((name = state.name) => formContext.removeIgnore(name)),
        deleteValue: ifFormContext(() => formContext.deleteValue(state.name)),
        setModified: ifFormContext(() => formContext.setModified(state.name)),
        clearModified: ifFormContext(() => formContext.clearModified(state.name)),
    };
    provide(FieldContextSymbol, returnObj);
    return returnObj;
}
