import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
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
    help: {
        type: String,
        default: undefined,
    },
    required: {
        type: Boolean,
        default: undefined, // let the default from field context take over
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    disabledFn: {
        type: Function,
        default: null,
    },
    contextless: {
        type: Boolean,
        default: false,
        description: "Ignore a field context even if it exists.",
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
 * @property {import('vue').WritableComputedRef<any>} valueDetail - The value detail of the widget.
 * @property {import('vue').ComputedRef<string>} combinedName - The combined name of the widget, either from the props
 * or the field context.
 * @property {import('vue').ComputedRef<string>} combinedLabel - The combined label of the widget, either from the props
 * @property {import('vue').ComputedRef<boolean>} disabled - Whether the widget is disabled.
 * @property {import('vue').ComputedRef<{invalid:boolean,warning:boolean}>} validationState - The validation state of the widget.
 * @property {import('vue').ComputedRef<boolean>} focused - Whether the widget is focused.
 * @property {import('vue').ComputedRef<boolean>} required - Whether the widget is required.
 * @property {import('vue').ComputedRef<boolean>} help - The help text.
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
 * @property {(value: any) => void} updateInitialValue - Update the initial value of the widget.
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
            valueDetail: computed({
                get: () => {
                    if (fieldContext) {
                        return fieldContext.state.valueDetail;
                    }
                    return undefined;
                },
                set: (value) => {
                    if (fieldContext) {
                        if (isEqual(value, fieldContext.state.valueDetail)) {
                            return;
                        }
                        fieldContext.state.valueDetail = value;
                    }
                },
            }),
            combinedValue: computed({
                get: () => {
                    if (props.contextless || props.modelValue !== undefined) {
                        return props.modelValue;
                    }
                    if (fieldContext) {
                        return fieldContext.state.value;
                    }
                    return undefined;
                },
                set: (value) => {
                    if (props.contextless || props.modelValue !== undefined) {
                        emit("update:modelValue", value);
                        return;
                    }
                    if (fieldContext) {
                        if (isEqual(value, fieldContext.state.value)) {
                            return;
                        }
                        fieldContext.state.value = value;
                    }
                },
            }),
            combinedName: computed(() => {
                return props.name?.length ? props.name : fieldContext.state.name;
            }),
            formModelName: computed(() => {
                return fieldContext?.state.formModelName;
            }),
            combinedLabel: computed(() => {
                return props.label?.length ? props.label : fieldContext.state.label;
            }),
            disabled: computed(() => {
                if (props.disabled) {
                    return props.disabledFn ? props.disabledFn() : true;
                }
                return false;
            }),
            validationState: computed(() => {
                if (!props.contextless && fieldContext) {
                    const hasErrors = Object.keys(fieldContext.state.errors || {}).length > 0;
                    const hasMessages = Object.keys(fieldContext.state.messages || {}).length > 0;
                    return {
                        invalid: hasErrors,
                        warning: hasMessages && !hasErrors,
                    };
                }
                return {
                    invalid: false,
                    warning: false,
                };
            }),
            focused: computed(() => {
                if (!props.contextless && fieldContext) {
                    return fieldContext.state.focused;
                }
                return false;
            }),
            required: computed(() => props.required ?? fieldContext?.state.required ?? false),
            help: computed(() => props.help ?? fieldContext?.state.help ?? false),
        }),
        setTouched: () => {
            if (!props.contextless && fieldContext) {
                fieldContext.setTouched();
            }
        },
        calculateModified: () => {
            if (!props.contextless && fieldContext) {
                fieldContext.calculateModified();
            }
        },
        focus: async () => {
            if (!props.contextless && fieldContext) {
                fieldContext.focus();
            }
        },
        blur: () => {
            if (!props.contextless && fieldContext) {
                fieldContext.blur();
                // FormContext handles setting touched
            }
        },
        updateInitialValue: (value) => {
            if (!props.contextless && fieldContext) {
                fieldContext.updateInitialValue(value);
            }
        },
    };
    provide(WidgetContextSymbol, widgetContext);
    return widgetContext;
}
