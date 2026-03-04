/**
 * @module use/useWidget
 * @description Provides the shared props, emits, and reactive context for form widget components, bridging field context with widget-level value handling and validation state.
 */
import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, inject, onUnmounted, provide, reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * Vue component props definition for widget components. Spread into component options to include standard
 * widget identification, display, validation, value handling, disabled behavior, and field context props.
 *
 * @vueda-spread props
 */
export const WIDGET_PROPS = {
    // *** Identification & Metadata ***
    /** The widget name; inherits from the surrounding field context when omitted. */
    name: {
        type: String,
        default: undefined,
    },

    // *** Display ***
    /** The label displayed next to the widget; inherits from the surrounding field context when omitted. */
    label: {
        type: String,
        default: undefined,
    },
    /** Help text displayed alongside the widget; inherits from the surrounding field context when omitted. */
    help: {
        type: String,
        default: undefined,
    },
    /** Whether the widget is read-only; inherits from the surrounding field context when omitted. */
    readOnly: {
        type: Boolean,
        default: false,
    },

    // *** Validation ***
    /** Whether the widget is required; inherits from the surrounding field context when undefined. */
    required: {
        type: Boolean,
        default: undefined, // let the default from field context take over
    },

    // *** Value Handling ***
    /** The widget's bound value (v-model); used only in contextless mode. */
    modelValue: {
        type: [String, Number, Boolean, Array, Object],
        default: undefined,
    },
    /** Adapter that converts the form model value into a value suitable for the widget UI. */
    fieldToWidget: {
        type: [Object, Function],
        default: null,
    },
    /** Adapter that converts the widget UI value back into a form model value for validation and submission. */
    widgetToField: {
        type: [Object, Function],
        default: null,
    },
    /** Manually set the invalid state when not in a field context. */
    invalid: {
        type: Boolean,
        default: undefined,
    },
    /** Manually set the warning state when not in a field context. */
    warning: {
        type: Boolean,
        default: undefined,
    },

    // *** Disabled Behavior ***
    /** Whether the widget is disabled. */
    disabled: {
        type: Boolean,
        default: false,
    },
    /** A function that returns whether the widget should be disabled; takes precedence over the disabled prop. */
    disabledFn: {
        type: Function,
        default: null,
    },

    // *** Field Context Behavior ***
    /** When true, the widget ignores any surrounding field or form context and manages its own state. */
    contextless: {
        type: Boolean,
        default: false,
        description: "Ignore a field context even if it exists.",
    },
    // *** Dependencies ***
    /** Field paths whose values the widget needs for display logic; registered with the field context. */
    displayDependencies: {
        type: Array,
        default: () => [],
    },
};

/**
 * Array of Vue event names emitted by widget components. Pass to the `emits` option of a widget component.
 *
 * @vueda-spread emits
 */
export const WIDGET_EMITS = [
    /** Emitted when the widget value changes. */
    "update:modelValue",
];

/**
 * The raw prop arguments for the useWidget function. (Matches WIDGET_PROPS).
 *
 * @typedef {object} WidgetContextRawProps
 *
 * // *** Identification & Metadata ***
 * @property {string} [name] - The name of the widget.
 *
 * // *** Display ***
 * @property {string} [label] - The label to display next to the widget.
 * @property {string} [help] - The help text for the widget.
 *
 * // *** Validation ***
 * @property {boolean} [required] - Whether the widget is required. Inherits from field context if undefined.
 * @property {boolean} [invalid] - Whether the widget is invalid, when not in a field context.
 * @property {boolean} [warning] - Whether the widget is in a warning state, when not in a field context.
 *
 * // *** Value Handling ***
 * @property {any} [modelValue] - The widget’s bound value (v-model).
 * @property {import('vue').Ref<ValueAdapter>|ValueAdapter|null} [fieldToWidget=null] - The value adapter for turing form
 *  values into values suitable for UI concerns.
 * @property {import('vue').Ref<ValueAdapter>|ValueAdapter|null} [widgetToField=null] - The value adapter for the widget values
 *  back into form values, for validation and submission concerns.
 *
 * // *** Disabled Behavior ***
 * @property {boolean} [disabled=false] - Whether the widget is disabled.
 * @property {() => boolean} [disabledFn=null] - A function that returns a boolean indicating disabled state.
 *
 * // *** Field Context Behavior ***
 * @property {boolean} [contextless=false] - If true, the widget ignores surrounding context like field or form.
 *
 * // *** Dependencies ***
 * @property {string[]} [displayDependencies] - The widget dependencies to register with the field context, if any.
 */

/**
 * The reactive prop arguments for the useWidget function. (Matches WIDGET_PROPS).
 *
 * @typedef {import('vue').UnwrapNestedRefs<WidgetContextRawProps>} WidgetContextProps
 */

/**
 * @typedef {(...args: any[]) => any} ValueAdapter
 */

/**
 * The raw reactive state for the useWidget function.
 *
 * @typedef {object} WidgetContextRawState
 *
 * // *** Identification & Metadata ***
 * @property {Readonly<import('vue').Ref<string>>} widgetId - A unique identifier for the widget.
 * @property {import('vue').ComputedRef<string>} combinedName - The effective name of the widget, from props or field context.
 * @property {import('vue').ComputedRef<string>} [formModelName] - The form model name from the field context.
 *
 * // *** Display ***
 * @property {import('vue').ComputedRef<string>} combinedLabel - The effective label of the widget.
 * @property {import('vue').ComputedRef<string>} help - The help text, from props or field context.
 * @property {import('vue').ComputedRef<boolean>} readOnly - Whether the widget is read-only.
 *
 * // *** Validation ***
 * @property {import('vue').ComputedRef<boolean>} required - Whether the widget is required.
 * @property {import('vue').ComputedRef<{invalid: boolean, warning: boolean}>} validationState - Validation state flags.
 *
 * // *** Value Handling ***
 * @property {import('vue').WritableComputedRef<any>} combinedValue - The widget’s effective form value (local or contextual).
 * @property {import('vue').WritableComputedRef<any>} adaptedValue - The widget’s value adapted for UI concerns.
 * @property {import('vue').ComputedRef<ValueAdapter|null>} fieldToWidget - The value adapter for turing form
 *  values into values suitable for UI concerns.
 * @property {import('vue').ComputedRef<ValueAdapter|null>} widgetToField - The value adapter for the widget values
 *  back into form values, for validation and submission concerns.
 *
 * // *** Interaction & State Tracking ***
 * @property {import('vue').ComputedRef<boolean>} touched - Whether the widget has been interacted with.
 * @property {import('vue').ComputedRef<boolean>} focused - Whether the widget is currently focused.
 *
 * // *** Disabled Behavior ***
 * @property {import('vue').ComputedRef<boolean>} disabled - Whether the widget is disabled.
 *
 * // *** Dependency Management ***
 * @property {import('vue').ComputedRef<{[path: string]: any}>} [dependencyValues] - Dependency values from context, if any.
 */

/**
 * The reactive state for the useWidget function.
 *
 * @typedef {import('vue').UnwrapNestedRefs<WidgetContextRawState>} WidgetContextState
 */

/**
 * The widget context object, a useWidget instance.
 *
 * @typedef {object} WidgetContext
 * @property {WidgetContextState} state - The widget context's reactive state.
 *
 * // *** Field Interactions ***
 * @property {() => void} setTouched - Set the widget as touched.
 * @property {() => void} clearTouched - Clear the widget's touched state.
 * @property {() => void} focus - Focus the widget.
 * @property {() => void} blur - Blur the widget.
 */

/**
 * Generate and provide a widget context for a widget, using the provided props and emit function, including methods to
 *  update the widget's value, touch state, force modified recalculation, and focus or blur it.
 *
 * @param {WidgetContextProps} props - The widget context's reactive props.
 * @param {import('vue').EmitFn} emit - The widget context's component emit function.
 * @returns {WidgetContext} The widget context object.
 */
export function useWidget(props, emit) {
    /** @type {import('@vueda/use/useField.js').FieldContext|null} */
    const rawFieldContext = inject(FieldContextSymbol, null);
    const fieldContext = computed(() => (!props.contextless ? unref(rawFieldContext) : null));

    // When no in context, or contextless, take over some functionality normally provided by field context
    const localFieldContext = reactive({
        localValue: null,
        focused: false,
        touched: false,
    });

    // allow local field context to be directly set for testing
    /* v8 ignore start */
    if (import.meta.env.MODE === "test") {
        if (props.testFocused) {
            localFieldContext.focused = props.testFocused;
        }
        if (props.testTouched) {
            localFieldContext.touched = props.testTouched;
        }
    }
    /* v8 ignore end */

    watch(
        [toRef(props, "modelValue"), fieldContext],
        ([newValue, newFc]) => {
            if (!newFc) {
                if (!isEqual(newValue, localFieldContext.localValue)) {
                    localFieldContext.localValue = newValue;
                }
            } else {
                if (localFieldContext.localValue !== newValue) {
                    localFieldContext.localValue = newValue;
                }
            }
        },
        {
            immediate: true,
            deep: true,
        },
    );

    /** @type {WidgetContextState} */
    const state = reactive({
        // *** Identification & Metadata ***
        widgetId: readonly(
            ref(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)),
        ),
        combinedName: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.name;
            }
            return props.name || "";
        }),
        formModelName: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.formModelName;
            }
            return null;
        }),

        // *** Display ***
        combinedLabel: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.label;
            }
            return props.label || "";
        }),
        help: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.help;
            }
            return props.help || "";
        }),
        readOnly: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.readOnly;
            }
            return !!props.readOnly;
        }),

        // *** Validation ***
        required: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.required;
            }
            return !!props.required;
        }),
        validationState: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                const hasErrors = Object.keys(fc.state.errors || {}).length > 0;
                const hasMessages = Object.keys(fc.state.messages || {}).length > 0;
                return {
                    invalid: hasErrors,
                    warning: hasMessages && !hasErrors,
                };
            }
            return {
                invalid: !!props.invalid,
                warning: !!props.warning,
            };
        }),

        // *** Value Handling ***
        combinedValue: computed({
            get: () => {
                const fc = unref(fieldContext);
                if (fc) {
                    return fc.state.value;
                }
                return localFieldContext.localValue;
            },
            set: (value) => {
                const fc = unref(fieldContext);
                if (fc) {
                    if (!isEqual(value, fc.state.value)) {
                        fc.state.value = value;
                    }
                } else {
                    if (props.modelValue !== undefined && props.modelValue !== value) {
                        emit("update:modelValue", value);
                    } else if (!isEqual(value, localFieldContext.localValue)) {
                        localFieldContext.localValue = value;
                    }
                }
            },
        }),
        adaptedValue: computed({
            get: () => {
                const f2w = unref(state.fieldToWidget);
                if (f2w && typeof f2w === "function") {
                    return f2w(state.combinedValue);
                }
                return state.combinedValue;
            },
            set: (value) => {
                const w2f = unref(state.widgetToField);
                if (w2f && typeof w2f === "function") {
                    state.combinedValue = w2f(value);
                } else {
                    state.combinedValue = value;
                }
            },
        }),
        fieldToWidget: computed(() => unref(props.fieldToWidget) ?? null),
        widgetToField: computed(() => unref(props.widgetToField) ?? null),

        // *** Interaction & State Tracking ***
        touched: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.touched;
            }
            return localFieldContext.touched;
        }),
        focused: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.focused;
            }
            return localFieldContext.focused;
        }),

        // *** Disabled Behavior ***
        disabled: computed(() => (props.disabledFn ? props.disabledFn() : props.disabled)),

        // *** Dependency Management ***
        dependencyValues: computed(() => {
            const fc = unref(fieldContext);
            if (fc) {
                return fc.state.dependencyValues;
            }
            return {};
        }),
        displayDependencies: readonly(toRef(props, "displayDependencies")),
    });
    /** @type {WidgetContext} */
    const widgetContext = {
        state,

        // *** Value Management ***
        updateValue: (value) => {
            const fc = unref(fieldContext);
            if (fc) {
                fc.state.value = value;
            } else {
                if (!isEqual(localFieldContext.localValue, value)) {
                    localFieldContext.localValue = value;
                    emit("update:modelValue", value);
                }
            }
        },
        deleteValue: () => {
            const fc = unref(fieldContext);
            if (fc) {
                fc.deleteValue?.(); // safe optional in case field context doesn't expose deleteValue
            } else {
                localFieldContext.localValue = undefined;
                emit("update:modelValue", undefined);
            }
        },

        // *** Field Interactions ***
        setTouched: () => {
            const fc = unref(fieldContext);
            if (fc) {
                fc.setTouched();
            } else {
                localFieldContext.touched = true;
            }
        },
        clearTouched: () => {
            const fc = unref(fieldContext);
            if (fc) {
                fc.clearTouched();
            } else {
                localFieldContext.touched = false;
            }
        },
        focus: () => {
            const fc = unref(fieldContext);
            if (fc) {
                fc.focus();
            } else {
                localFieldContext.focused = true;
            }
        },
        blur: () => {
            const fc = unref(fieldContext);
            if (fc) {
                fc.blur();
            } else {
                localFieldContext.focused = false;
            }
        },
    };
    provide(WidgetContextSymbol, widgetContext);
    let dependencyValuesId;
    if (unref(fieldContext)) {
        dependencyValuesId = unref(fieldContext).registerDependencyValues(toRef(state, "displayDependencies"));
    }
    onUnmounted(() => {
        if (dependencyValuesId) {
            unref(fieldContext).unregisterDependencyValues(dependencyValuesId);
        }
    });

    return widgetContext;
}
