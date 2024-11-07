import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, provide, reactive, readonly, ref } from "vue";

/**
 * The reactive props we expect widgets to receive and pass to useWidget when creating a widget context.
 *
 * @typedef {object} WIDGET_PROPS
 * @property {string} [name] - The name of the widget.
 * @property {any} [modelValue] - The model value of the widget.
 * @property {string} [label] - The label of the widget.
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
    label: {
        type: String,
        default: undefined,
    },
    hidden: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    disabledFn: {
        type: Function,
        default: null,
    },
};

export const WIDGET_EMITS = ["update:modelValue"];

/**
 * The widget context's raw reactive state.
 *
 * @typedef {object} WidgetRawState
 * @property {Readonly<import('vue').Ref<string>>} widgetId - A unique identifier for the widget.
 * @property {import('vue').WritableComputedRef<any>} combinedValue - The combined value of the widget, either from the model or
 * the field context.
 * @property {import('vue').ComputedRef<string>} combinedName - The combined name of the widget, either from the props
 * or the field context.
 * @property {import('vue').ComputedRef<string>} combinedLabel - The combined label of the widget, either from the props
 * @property {import('vue').ComputedRef<boolean>} disabled - Whether the widget is disabled.

 * or the field context.
 */

/**
 * The widget context's reactive state.
 *
 * @typedef {import('vue').UnwrapNestedRefs<WidgetRawState>} WidgetState
 */

/**
 * The widget context object.
 *
 * @typedef {object} WidgetContext
 * @property {WidgetState} state - The widget context's reactive state.
 * @property {() => void} setTouched - Set the widget as touched.
 * @property {() => void} calculateModified - Calculate the modified state of the widget.
 * @property {() => void} focus - Focus the widget.
 * @property {() => void} blur - Blur the widget.
 */

/**
 * Generate and provide a widget context for a widget, using the provided props and emit function, including methods to
 *  update the widget's value, touch state, force modified recalculation, and focus or blur it.
 *
 * @param {import('vue').UnwrapRef<WIDGET_PROPS>} props - The widget context's reactive props.
 * @param {import('vue').EmitFn} emit - The widget context's component emit function.
 * @return {WidgetContext} The widget context object.
 */
export function useWidget(props, emit) {
    /** @type {import('@vueda/use/useField.js').FieldContext|null} */
    const fieldContext = inject(FieldContextSymbol, null);
    const widgetContext = {
        state: reactive({
            widgetId: readonly(
                ref(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
            ),
            combinedValue: computed({
                get: () => {
                    if (props.modelValue !== undefined) {
                        return props.modelValue;
                    }
                    if (fieldContext) {
                        return fieldContext.state.value;
                    }
                    return undefined;
                },
                set: (value) => {
                    if (props.modelValue !== undefined) {
                        emit("update:modelValue", value);
                    }
                    if (fieldContext) {
                        fieldContext.state.value = value;
                    }
                },
            }),
            combinedName: computed(() => {
                debugger;
                return props.name?.length ? props.name : fieldContext.state.name;
            }),
            combinedLabel: computed(() => {
                debugger;
                return props.label?.length ? props.label : fieldContext.state.label;
            }),
            disabled: computed(() => {
                if (props.disabled) {
                    return props.disabledFn ? props.disabledFn() : true;
                }
                return false;
            }),
        }),
        setTouched: () => {
            if (fieldContext) {
                fieldContext.setTouched();
            }
        },
        calculateModified: () => {
            if (fieldContext) {
                fieldContext.calculateModified();
            }
        },
        focus: async () => {
            if (fieldContext) {
                fieldContext.focus();
            }
        },
        blur: () => {
            if (fieldContext) {
                fieldContext.blur();
                // FormContext handles setting touched
            }
        },
    };
    provide(WidgetContextSymbol, widgetContext);
    return widgetContext;
}
