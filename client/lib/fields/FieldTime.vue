<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
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
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const valueAsTime = computed(() => {
    const value = fieldContext.state.value;
    if (value) {
        return new Date(`1970-01-01T${value}Z`);
    }
    return null;
});
watch(
    [toRef(props, "maxValue"), valueAsTime],
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
    [toRef(props, "minValue"), valueAsTime],
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
    <div data-qa="field-time">
        <slot />
    </div>
</template>
