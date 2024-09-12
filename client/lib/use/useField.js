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
        fieldContext.deleteValue();
    });
}
/**
 * @typedef {object} FieldContextRawState
 * @property {import('vue').ComputedRef<string>} name - The name of the field.
 * @property {import('vue').ComputedRef<string>} label - The label for the field.
 * @property {import('vue').ComputedRef<string>} help - The help text for the field.
 * @property {import('vue').WritableComputedRef<any>} value - The current value of the field.
 * @property {import('vue').ComputedRef<any>} initialValue - The initial value of the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} messages - The messages for the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} errors - The errors for the field.
 * @property {import('vue').ComputedRef<boolean>} modified - Whether the field has been modified.
 * @property {import('vue').ComputedRef<boolean>} touched - Whether the field has been touched.
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
 * @property {() => void} ignore - Ignore the field.
 * @property {() => void} removeIgnore - Remove ignoring the field.
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
 *     validate: (value: any) => boolean,
 *     requiredFn: (value: any) => boolean,
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
        label: computed(() => (props.label?.length ? props.label : props.name)),
        help: computed(() => props.help || ""),
        suffix: computed(() => props.rangeSuffix || ""),
        value: formContext
            ? computed({
                  get: () => {
                      const value = get(formContext.state.values, props.name);
                      return functions?.preprocessGet ? functions.preprocessGet(value) : value;
                  },
                  set: (newValue) => {
                      if (functions?.preprocessSet) {
                          newValue = functions.preprocessSet(newValue);
                      }
                      if (newValue === undefined) {
                          formContext.deleteValue(state.name);
                          emit("update:modelValue", undefined);
                      } else {
                          formContext.updateValue(state.name, newValue);
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
    });
    const checkRequired = () => {
        if (props.required && state.touched && formContext) {
            if (!unref(requiredFn)(state.value)) {
                formContext.updateError(props.name, "required", requiredMessage.value);
            } else {
                formContext.deleteError(props.name, "required");
            }
        }
    };

    const checkCustomValidation = () => {
        if (props.validate && state.touched && formContext) {
            const result = props.validate(state.value);
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
                    formContext.calculateModified(props.name);
                }
                checkRequired();
                checkCustomValidation();
            }
        },
        { deep: true },
    );

    watch(
        [
            toRef(props, "required"),
            toRef(props, "requiredMessage"),
            toRef(props, "validate"),
            requiredFn,
            toRef(state, "touched"),
            toRef(state, "modified"),
        ],
        (
            [newRequired, newRequiredMessage, newValidate, newRequiredFn, newTouched, newModified],
            [oldRequired, oldRequiredMessage, oldValidate, oldRequiredfn, oldTouched, oldModified],
        ) => {
            const requiredChanged = newRequired !== oldRequired;
            const requiredMessageChanged = newRequiredMessage !== oldRequiredMessage;
            const validateChanged = newValidate !== oldValidate;
            const requiredFnChanged = newRequiredFn !== oldRequiredfn;
            const touchedChanged = newTouched !== oldTouched;
            const modifiedChanged = newModified !== oldModified;
            if (requiredChanged || requiredMessageChanged || touchedChanged || modifiedChanged || requiredFnChanged) {
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
        blur: ifFormContext(() => formContext.blur(state.name)),
        ignore: ifFormContext(() => formContext.ignore(state.name)),
        removeIgnore: ifFormContext(() => formContext.removeIgnore(state.name)),
        deleteValue: ifFormContext(() => formContext.deleteValue(state.name)),
    };
    provide(FieldContextSymbol, returnObj);
    return returnObj;
}
