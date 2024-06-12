<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";

const props = defineProps({
    ...fieldProps,
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    minValue: {
        type: [Date, String],
        default: undefined,
    },
});
const fieldContext = useField(props);
const valueAsDateTime = computed(() => {
    const value = fieldContext.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
watch(
    [toRef(props, "maxValue"), valueAsDateTime],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            fieldContext.updateError(props.name, "maxValue", `Must be ${maxValue} or less.`);
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), valueAsDateTime],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            fieldContext.updateError(props.name, "minValue", `Must be ${minValue} or more.`);
        }
    },
    { immediate: true },
);
</script>
<template><slot /></template>
