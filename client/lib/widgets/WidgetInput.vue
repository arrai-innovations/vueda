<script setup>
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...widgetProps,
    type: {
        type: String,
        default: "text",
    },
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
</script>
<template>
    <div>
        <input :type="type" :name="widget.combinedName" v-model="widget.combinedValue" />
    </div>
</template>
