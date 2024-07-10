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
        v-model="widgetContext.combinedValue"
        v-bind="$attrs"
        auto-resize
        :class="combinedClasses.textareaClass"
        cols="30"
        :name="widgetContext.combinedName"
        rows="5"
        @blur="widgetContext.blur"
        @change="widgetContext.makeDirty"
        @focus="widgetContext.focus"
    />
</template>
