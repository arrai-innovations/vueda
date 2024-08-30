<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
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
    step: {
        type: Number,
        default: 60,
        description: "The step in seconds.",
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const formatTime = (date) => {
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
};
/**
 * Convert a time string or Date object to a comparable value.
 * @param {String|Date} time - The time to convert.
 * @returns {Number|null} The comparable value.
 */
const timeToComparableValue = (time) => {
    if (typeof time === "string") {
        const [hours, minutes, seconds] = time.split(":").map(Number);
        return hours * 3600 + minutes * 60 + (seconds || 0);
    }
    return time instanceof Date ? time.getUTCHours() * 3600 + time.getUTCMinutes() * 60 + time.getUTCSeconds() : null;
};
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue instanceof Date) {
            // coerce to string
            fieldContext.state.value = formatTime(newValue);
        }
    },
    { immediate: true },
);
/**
 * The value as a comparable time value.
 * @type {import('vue').ComputedRef<number|null>}
 */
const valueAsTime = computed(() => {
    const value = fieldContext.state.value;
    return value ? timeToComparableValue(value) : null;
});
watch(
    [toRef(props, "maxValue"), valueAsTime],
    ([maxValue, value]) => {
        const maxTimeValue = timeToComparableValue(maxValue);
        if (maxTimeValue !== null && value > maxTimeValue) {
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
        const minTimeValue = timeToComparableValue(minValue);
        if (minTimeValue !== null && value < minTimeValue) {
            fieldContext.updateError("minValue", `Must be ${minValue} or more.`);
        } else {
            fieldContext.deleteError("minValue");
        }
    },
    { immediate: true },
);
watch(
    [toRef(props, "step"), valueAsTime],
    ([step, value]) => {
        if (step) {
            if (value !== null && value % step !== 0) {
                fieldContext.updateError("step", `Must be a multiple of ${step}.`);
            } else {
                fieldContext.deleteError("step");
            }
        }
    },
    { immediate: true },
);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-time">
        <slot />
    </div>
</template>
