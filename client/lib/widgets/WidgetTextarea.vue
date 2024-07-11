<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import Textarea from "primevue/textarea";

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
    textareaClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetTextarea", props);
</script>
<template>
    <Textarea
        v-bind="$attrs"
        v-model="widgetContext.state.combinedValue"
        auto-resize
        :class="combinedClasses.textareaClass"
        cols="30"
        :name="widgetContext.state.combinedName"
        rows="5"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    />
</template>
