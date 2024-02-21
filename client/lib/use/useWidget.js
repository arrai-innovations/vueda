// useWidget.js
import { FieldContextSymbol } from "@vueda/use/useField.js";
import { computed, inject, reactive } from "vue";

export const widgetProps = {
    name: {
        type: String,
        default: undefined,
    },
    modelValue: {
        type: [String, Number, Boolean, Array, Object],
        default: undefined,
    },
};

export const widgetEmits = ["update:modelValue"];

export default function useWidget(props, emit) {
    const fieldContext = inject(FieldContextSymbol);
    const combinedValue = computed({
        get: () => {
            if (props.modelValue) {
                return props.modelValue;
            }
            if (fieldContext) {
                return fieldContext.value;
            }
            return undefined;
        },
        set: (value) => {
            if (props.modelValue) {
                emit("update:modelValue", value);
            }
            if (fieldContext) {
                fieldContext.value = value;
            }
        },
    });
    return reactive({
        widgetId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        combinedValue,
        combinedName: computed(() => {
            return props.name || fieldContext.name;
        }),
    });
}
