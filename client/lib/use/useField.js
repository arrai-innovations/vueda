import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, inject, provide, reactive, watch } from "vue";

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
};

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
 * The raw field context object.
 *
 * @typedef {object} FieldContextRaw
 * @property {import('vue').ComputedRef<string>} name - The name of the field.
 * @property {import('vue').ComputedRef<string>} label - The label for the field.
 * @property {import('vue').ComputedRef<string>} help - The help text for the field.
 * @property {import('vue').ComputedRef<any>} value - The current value of the field.
 * @property {import('vue').ComputedRef<any>} initialValue - The initial value of the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} messages - The messages for the field.
 * @property {import('vue').ComputedRef<{[code: string]: string}>} errors - The errors for the field.
 * @property {import('vue').ComputedRef<boolean>} dirty - Whether the field has been interacted with.
 * @property {(value: any) => void} updateValue - Update the field's value.
 * @property {() => void} deleteValue - Delete the field's value.
 * @property {(code: string, message: string) => void} updateError - Update the field's error.
 * @property {(code: string) => void} deleteError - Delete the field's error.
 * @property {(code: string, message: string) => void} updateMessage - Update the field's message.
 * @property {(code: string) => void} deleteMessage - Delete the field's message.
 * @property {() => void} setDirty - Set the field as dirty.
 * @property {() => void} clearDirty - Clear the field's dirty state.
 * @property {() => void} focus - Focus on the field.
 * @property {() => void} blur - Blur the field.
 */

/**
 * The field context object, providing methods to
 *
 * @typedef {import('vue').UnwrapNestedRefs<FieldContextRaw>} FieldContext
 */

/**
 * The non-reactive `functions` that can be passed to useField.
 *
 * @typedef {object} FieldContextFunctions
 * @property {(value: any) => boolean} [required] - A custom required validation function
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
 * }>} FieldContextProps
 */

/**
 * Generate and provide a field context for a field, using the provided props and functions, including methods to update
 *  the field's value, errors, messages, dirty state, and to focus or blur it.
 *
 * @param {FieldContextProps} props - The field context's reactive props.
 * @param {FieldContextFunctions} [functions] - The field context's non-reactive functions.
 * @returns {FieldContext} The field context object.
 */
export function useField(props, functions) {
    const formContext = inject(FormContextSymbol, null);

    const requiredFn = functions?.required || defaultValidateRequired;
    const requiredMessage = computed(() => {
        return props.requiredMessage || "This field is required.";
    });
    const name = computed(() => {
        return props.name;
    });
    const label = computed(() => {
        return props.label?.length ? props.label : props.name;
    });
    const help = computed(() => {
        return props.help || "";
    });
    const value = computed(() => {
        return formContext ? get(formContext.values, props.name) : undefined;
    });
    const initialValue = computed(() => {
        return formContext ? get(formContext.initialValues, props.name) : undefined;
    });
    const messages = computed(() => {
        return formContext ? get(formContext.messages, props.name) : {};
    });
    const errors = computed(() => {
        return formContext ? get(formContext.errors, props.name) : {};
    });
    const dirty = computed(() => {
        return formContext ? get(formContext.dirty, props.name) : false;
    });
    const checkRequired = () => {
        if (props.required && dirty.value && formContext) {
            if (!requiredFn(value.value)) {
                formContext.updateError(props.name, "required", requiredMessage.value);
            } else {
                formContext.deleteError(props.name, "required");
            }
        }
    };

    const checkCustomValidation = () => {
        if (props.validate && dirty.value && formContext) {
            const result = props.validate(value.value);
            if (result === true) {
                formContext.deleteError(props.name, "validate");
            } else {
                formContext.updateError(props.name, "validate", result);
            }
        }
    };

    watch(
        () => cloneDeep(value.value),
        (newValue, oldValue) => {
            if (!isEqual(newValue, oldValue)) {
                checkRequired();
                checkCustomValidation();
            }
        },
        { deep: true },
    );

    watch(
        () => ({
            required: props.required,
            requiredMessage: props.requiredMessage,
            validate: props.validate,
            dirty: dirty.value,
            formContext: formContext,
        }),
        (newProps, oldProps) => {
            const requiredChanged = newProps.required !== oldProps?.required;
            const requiredMessageChanged = newProps.requiredMessage !== oldProps?.requiredMessage;
            const validateChanged = newProps.validate !== oldProps?.validate;
            const dirtyChanged = newProps.dirty !== oldProps?.dirty;
            const formContextChanged = newProps.formContext !== oldProps?.formContext;
            if (requiredChanged || requiredMessageChanged || dirtyChanged || formContextChanged) {
                checkRequired();
            }
            if (validateChanged || dirtyChanged || formContextChanged) {
                checkCustomValidation();
            }
        },
        { immediate: true },
    );
    // watch(
    //     toRef(props, "name"),
    //     (newValue, oldValue) => {
    //         if (newValue !== oldValue) {
    //             // todo: decide if we want to support this and what we would need to do
    //         }
    //     },
    // );
    const returnObj = reactive({
        name,
        label,
        help,
        value,
        initialValue,
        messages,
        errors,
        dirty,
        updateValue: (value) => {
            if (formContext) {
                formContext.updateValue(name.value, value);
            }
        },
        deleteValue: () => {
            if (formContext) {
                formContext.deleteValue(name.value);
            }
        },
        updateError: (code, message) => {
            if (formContext) {
                formContext.updateError(name.value, code, message);
            }
        },
        deleteError: (code) => {
            if (formContext) {
                formContext.deleteError(name.value, code);
            }
        },
        updateMessage: (code, message) => {
            if (formContext) {
                formContext.updateMessage(name.value, code, message);
            }
        },
        deleteMessage: (code) => {
            if (formContext) {
                formContext.deleteMessage(name.value, code);
            }
        },
        setDirty: () => {
            if (formContext) {
                formContext.setDirty(name.value);
            }
        },
        clearDirty: () => {
            if (formContext) {
                formContext.clearDirty(name.value);
            }
        },
        focus: () => {
            if (formContext) {
                formContext.focus(name.value);
            }
        },
        blur: () => {
            if (formContext) {
                formContext.blur(name.value);
            }
        },
    });
    provide(FieldContextSymbol, returnObj);
    return returnObj;
}
