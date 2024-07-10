import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, reactive, readonly, ref } from "vue";

/**
 * The reactive props we expect widgets to receive and pass to useWidget when creating a widget context.
 *
 * @typedef {object} WIDGET_PROPS
 * @property {string} [name] - The name of the widget.
 * @property {any} [modelValue] - The model value of the widget.
 */
export const WIDGET_PROPS = {
    name: {
        type: String,
        default: undefined,
    },
    modelValue: {
        type: [String, Number, Boolean, Array, Object],
        default: undefined,
    },
};

export const WIDGET_EMITS = ["update:modelValue"];

/**
 * The raw widget context object.
 *
 * @typedef {object} WidgetContextRaw
 * @property {Readonly<Ref<string>>} widgetId - A unique identifier for the widget.
 * @property {import('vue').ComputedRef<any>} combinedValue - The combined value of the widget, either from the model or
 *  the field context.
 * @property {import('vue').ComputedRef<string>} combinedName - The combined name of the widget, either from the props
 *  or the field context.
 * @property {() => void} makeDirty - Mark the widget as dirty.
 * @property {() => void} clearDirty - Clear the dirty state of the widget.
 * @property {() => void} focus - Focus the widget.
 * @property {() => void} blur - Blur the widget.
 */

/**
 * The widget context object.
 *
 * @typedef {Readonly<WidgetContextRaw>} WidgetContext
 */

/**
 * Generate and provide a widget context for a widget, using the provided props and emit function, including methods to
 *  update the widget's value, mark it as dirty, and focus or blur it.
 *
 * @param {import('vue').UnwrapRef<WIDGET_PROPS>} props - The widget context's reactive props.
 * @param {import('vue').SetupContext['emit']} emit - The widget context's component emit function.
 * @return {WidgetContext} The widget context object.
 */
export function useWidget(props, emit) {
    const fieldContext = inject(FieldContextSymbol, null);
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
                fieldContext.updateValue(value);
            }
        },
    });
    const makeDirty = () => {
        if (!fieldContext.dirty) {
            fieldContext.setDirty();
        }
    };
    const clearDirty = () => {
        if (fieldContext.dirty) {
            fieldContext.clearDirty();
        }
    };
    const widgetId = ref(null);
    widgetId.value = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return reactive({
        widgetId: readonly(widgetId),
        combinedValue,
        combinedName: computed(() => {
            return props.name || fieldContext.name;
        }),
        makeDirty,
        clearDirty,
        focus: () => {
            if (fieldContext) {
                fieldContext.focus();
            }
        },
        blur: () => {
            if (fieldContext) {
                fieldContext.blur();
            }
        },
    });
}
