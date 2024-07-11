<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Dropdown from "primevue/dropdown";

defineOptions({
    inheritAttrs: false,
});
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
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    innerClass: {
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
const combinedClasses = useCombinedClasses("WidgetSelect", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <widget-label :label-class="combinedClasses.labelClass" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="combinedClasses.innerClass">
                <dropdown
                    v-model="widgetContext.state.combinedValue"
                    :name="widgetContext.state.combinedName"
                    v-bind="$attrs"
                    option-label="label"
                    option-value="value"
                    :options="props.options"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                />
            </div>
        </widget-label>
    </div>
</template>
