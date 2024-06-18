import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, inject, provide, reactive, watch } from "vue";

export const fieldProps = {
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

export function defaultValidateRequired(value) {
    return value !== null && value !== undefined && value !== "" && value !== false && value !== 0;
}

export default function useField(props, functions) {
    const formContext = inject(FormContextSymbol, null);

    const requiredFn = functions?.required || defaultValidateRequired;
    const requiredMessage = computed(() => {
        return props.requiredMessage || "This field is required.";
    });
    const name = computed(() => {
        return props.name;
    });
    const label = computed(() => {
        return props.label || props.name;
    });
    const help = computed(() => {
        return props.help || "";
    });
    const value = computed(() => {
        return formContext ? get(formContext.values, props.name) : undefined;
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
    });
    provide(FieldContextSymbol, returnObj);
    return returnObj;
}
