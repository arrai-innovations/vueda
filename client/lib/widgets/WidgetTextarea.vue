<script setup>
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";
import Textarea from "primevue/textarea";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...widgetProps,
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
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
const combinedClasses = useCombinedClasses("@vueda/widgets/WidgetTextarea.vue", props);
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
            @input="widget.makeDirty"
        />
    </div>
</template>
