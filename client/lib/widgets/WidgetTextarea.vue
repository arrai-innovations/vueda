<script setup>
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...widgetProps,
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
</script>
<template>
    <div>
        <textarea :name="widget.combinedName" v-model="widget.combinedValue" v-bind="$attrs" />
    </div>
</template>
