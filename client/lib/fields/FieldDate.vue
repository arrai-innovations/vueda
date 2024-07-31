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
const valueAsDate = computed(() => {
    const value = fieldContext.state.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
watch(
    [toRef(props, "maxValue"), valueAsDate],
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
    [toRef(props, "minValue"), valueAsDate],
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
    <div data-qa="field-date">
        <slot />
    </div>
</template>
