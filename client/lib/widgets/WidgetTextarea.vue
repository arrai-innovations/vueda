<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

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
        <textarea
            v-model="widget.combinedValue"
            :class="combinedClasses.textareaClass"
            :name="widget.combinedName"
            v-bind="$attrs"
            @input="widget.makeDirty"
        />
    </div>
</template>
