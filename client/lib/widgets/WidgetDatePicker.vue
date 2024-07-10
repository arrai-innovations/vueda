<script setup>
import { useCombinedClasses } from "../use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "../use/useWidget.js";
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
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetDatePicker", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        {{ widget.combinedValue }}
        <Calendar
            v-model="widget.combinedValue"
            :class="combinedClasses.inputClass"
            :name="widget.combinedName"
            v-bind="$attrs"
            @blur="widget.blur"
            @change="widget.makeDirty"
            @focus="widget.focus"
        />
    </div>
</template>

//TODO: make a field level that handles when returned array it should retrun the disaed way? // IT should know what
filter it is and return the disred formated query string
