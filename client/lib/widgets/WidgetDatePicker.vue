<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import Calendar from "primevue/calendar";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
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
    useFloatingLabel: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetDatePicker", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <widget-label :label-class="combinedClasses.labelClass" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="combinedClasses.innerClass">
                <Calendar
                    v-model="widgetContext.state.combinedValue"
                    :name="widgetContext.state.combinedName"
                    v-bind="$attrs"
                    @blur="widgetContext.blur"
                    @focus="widgetContext.focus"
                />
            </div>
        </widget-label>
    </div>
</template>

<!-- TODO: make a field level that handles when returned array it should retrun the disaed way?
      IT should know what filter it is and return the disred formated query string -->
