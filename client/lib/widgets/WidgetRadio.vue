<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";

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
    inputClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetRadio", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
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
                    :class="combinedClasses.labelClass"
                    :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                    :label="option.label"
                    :name="$slots[`label-${option.value}`] ? `label-${option.value}` : 'default'"
                >
                    <label
                        :class="combinedClasses.labelClass"
                        :for="`${widgetContext.state.combinedName}-${option.value}-${widgetContext.state.widgetId}`"
                        >{{ option.label }}</label
                    >
                </slot>
            </li>
        </ul>
    </div>
</template>
