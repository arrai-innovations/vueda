<script setup>
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...widgetProps,
    options: {
        type: Array,
        required: true,
    },
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
</script>

<template>
    <div>
        <select :name="widget.combinedName" v-model="widget.combinedValue">
            <option v-for="option in props.options" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
    </div>
</template>
