import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, inject, provide, readonly, toRef, watch } from "vue";

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
    const formContext = inject(FormContextSymbol);

    const requiredFn = functions?.required || defaultValidateRequired;
    const requiredMessage = computed(() => {
        return props.requiredMessage || "This field is required.";
    });
    const name = computed(() => {
        return props.name;
    });
    const help = computed(() => {
        return props.help || "";
    });
    const value = computed({
        get() {
            return get(formContext.values, props.name);
        },
        set(value) {
            formContext.updateFormValue(props.name, value);
        },
    });
    const messages = computed(() => {
        return get(formContext.messages, props.name);
    });
    const errors = computed(() => {
        return get(formContext.errors, props.name);
    });
    const dirty = computed(() => {
        return get(formContext.dirty, props.name);
    });
    const checkRequired = () => {
        if (dirty.value && props.required && !requiredFn(value.value)) {
            formContext.updateError(props.name, "required", requiredMessage.value);
        } else {
            formContext.deleteError(props.name, "required");
        }
    };
    const checkIfChanged = (newValue, oldValue) => {
        if (newValue !== oldValue) {
            checkRequired();
            if (props.validate) {
                const result = props.validate(value.value);
                if (result === true) {
                    formContext.deleteError(props.name, "validate");
                } else {
                    formContext.updateError(props.name, "validate", result);
                }
            } else {
                formContext.deleteError(props.name, "validate");
            }
        }
    };
    watch(
        () => cloneDeep(value.value),
        (newValue, oldValue) => {
            if (!isEqual(newValue, oldValue)) {
                checkRequired();
            }
        },
        { deep: true },
    );
    watch(toRef(props, "required"), checkIfChanged, {
        // only one checkIfChanged needs to be immediate
        immediate: true,
    });
    watch(toRef(props, "requiredMessage"), checkIfChanged);
    watch(dirty, checkIfChanged);
    watch(toRef(props, "validate"), checkIfChanged);
    // watch(
    //     toRef(props, "name"),
    //     (newValue, oldValue) => {
    //         if (newValue !== oldValue) {
    //             // todo: decide if we want to support this and what we would need to do
    //         }
    //     },
    // );
    const returnObj = readonly({
        name,
        help,
        value,
        messages,
        errors,
        dirty,
        updateFormValue: (value) => {
            formContext.updateFormValue(name.value, value);
        },
        deleteFormValue: () => {
            formContext.deleteFormValue(name.value);
        },
        updateError: (code, message) => {
            formContext.updateError(name.value, code, message);
        },
        deleteError: (code) => {
            formContext.deleteError(name.value, code);
        },
        updateMessage: (code, message) => {
            formContext.updateMessage(name.value, code, message);
        },
        deleteMessage: (code) => {
            formContext.deleteMessage(name.value, code);
        },
        setDirty: () => {
            formContext.setDirty(name.value);
        },
        clearDirty: () => {
            formContext.clearDirty(name.value);
        },
    });
    provide(FieldContextSymbol, returnObj);
    return returnObj;
}
