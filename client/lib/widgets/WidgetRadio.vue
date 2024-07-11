<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";

const props = defineProps({
    ...WIDGET_PROPS,
    options: {
        type: Array,
        required: true,
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    optionsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    optionClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    innerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    inputClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    optionLabelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetRadio", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <widget-label :label-class="combinedClasses.labelClass" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="combinedClasses.innerClass">
                <ul :class="combinedClasses.optionsClass">
                    <li v-for="option in props.options" :key="option.value" :class="combinedClasses.optionClass">
                        <input
                            :id="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                            :checked="widgetContext.state.combinedValue === option.value"
                            :class="combinedClasses.inputClass"
                            :name="widgetContext.state.combinedName"
                            type="radio"
                            :value="option.value"
                            @blur="widgetContext.blur"
                            @focus="widgetContext.focus"
                            @update:checked="widgetContext.state.combinedValue = option.value"
                        />
                        <slot
                            :class="combinedClasses.optionLabelClass"
                            :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                            :label="option.label"
                            :name="$slots[`label-${option.value}`] ? `label-${option.value}` : 'default'"
                        >
                            <label
                                :class="combinedClasses.optionLabelClass"
                                :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                                >{{ option.label }}</label
                            >
                        </slot>
                    </li>
                </ul>
            </div>
        </widget-label>
    </div>
</template>
