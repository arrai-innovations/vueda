<script setup>
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...widgetProps,
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
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("@vueda/widgets/WidgetRadio.vue", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <ul :class="combinedClasses.optionsClass">
            <li v-for="option in props.options" :key="option.value" :class="combinedClasses.optionClass">
                <input
                    :id="`${widget.combinedName}-${option.value}-${widget.widgetId}`"
                    v-model="widget.combinedValue"
                    :checked="widget.combinedValue === option.value"
                    :class="combinedClasses.inputClass"
                    :name="widget.combinedName"
                    type="radio"
                    :value="option.value"
                    @blur="widget.blur"
                    @change="widget.makeDirty"
                    @focus="widget.focus"
                />
                <slot
                    :class="combinedClasses.labelClass"
                    :for="`${widget.combinedName}-${option.value}-${widget.widgetId}`"
                    :label="option.label"
                    :name="$slots[`label-${option.value}`] ? `label-${option.value}` : 'default'"
                >
                    <label
                        :class="combinedClasses.labelClass"
                        :for="`${widget.combinedName}-${option.value}-${widget.widgetId}`"
                        >{{ option.label }}</label
                    >
                </slot>
            </li>
        </ul>
    </div>
</template>
