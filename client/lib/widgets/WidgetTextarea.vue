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
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("WidgetTextarea", props);
</script>
<template>
    <div :class="combinedClasses.outerClass">
        <Textarea
            v-model="widget.combinedValue"
            v-bind="$attrs"
            auto-resize
            :class="combinedClasses.textareaClass"
            cols="30"
            :name="widget.combinedName"
            rows="5"
            @blur="widget.blur"
            @focus="widget.focus"
            @input="widget.makeDirty"
        />
    </div>
</template>
