<script setup>
import { FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { computed, toRef, watch } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
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
    const value = fieldContext.state.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
watch(
    [toRef(props, "maxValue"), valueAsDateTime],
    ([maxValue, value]) => {
        if (maxValue && value > maxValue) {
            fieldContext.updateError("maxValue", `Must be ${maxValue} or less.`);
        } else {
            fieldContext.deleteError("maxValue");
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "minValue"), valueAsDateTime],
    ([minValue, value]) => {
        if (minValue && value < minValue) {
            fieldContext.updateError("minValue", `Must be ${minValue} or more.`);
        } else {
            fieldContext.deleteError("minValue");
        }
    },
    { immediate: true },
);
</script>
<template>
    <div data-qa="field-date-time">
        <slot />
    </div>
</template>
