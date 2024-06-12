<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, toRef, watch } from "vue";

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
const formContext = inject(FormContextSymbol);
const fieldContext = useField(props);
const valueAsTime = computed(() => {
    const value = fieldContext.value;
    if (value) {
        return new Date(`1970-01-01T${value}Z`);
    }
    return null;
});
watch(
    [toRef(props, "maxValue"), valueAsTime],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            formContext.updateError(props.name, "maxValue", `Must be ${maxValue} or less.`);
        } else {
            formContext.deleteError(props.name, "maxValue");
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), valueAsTime],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            formContext.updateError(props.name, "minValue", `Must be ${minValue} or more.`);
        } else {
            formContext.deleteError(props.name, "minValue");
        }
    },
    { immediate: true },
);
</script>
<template>
    <slot />
</template>
