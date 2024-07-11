<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
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
    inputClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    prefixClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    suffixClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetDatePicker", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <Calendar
            v-model="widgetContext.state.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widgetContext.state.combinedName"
            v-bind="$attrs"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        />
    </div>
</template>

<!-- TODO: make a field level that handles when returned array it should retrun the disaed way?
      IT should know what filter it is and return the disred formated query string -->
