<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { computed, watch } from "vue";

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
const preprocessGet = (value) => {
    if (typeof value === "string") {
        return new Date(value);
    }
    return value;
};
const preprocessSet = (value) => {
    if (value instanceof Date) {
        const date = new Date(value);
        date.setTime(date.getTime() - date.getTimezoneOffset() * 60000);
        const isoString = date.toISOString();
        const timezoneOffset = date.getTimezoneOffset();
        const offsetSign = timezoneOffset > 0 ? "-" : "+";
        const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
            .toString()
            .padStart(2, "0");
        const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, "0");
        return `${isoString.split(".")[0]}${offsetSign}${offsetHours}:${offsetMinutes}`;
    }
    return value;
};
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit, { preprocessGet, preprocessSet });
const valueAsDateTime = computed(() => {
    const value = fieldContext.state.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
const maxValueAsDateTime = computed(() => {
    const maxValue = props.maxValue;
    if (maxValue) {
        return new Date(maxValue);
    }
    return null;
});
const minValueAsDateTime = computed(() => {
    const minValue = props.minValue;
    if (minValue) {
        return new Date(minValue);
    }
    return null;
});
//TODO: Fix datetime
// watch(
//     toRef(fieldContext.state, "value"),
//     (newValue) => {
//         console.log("Watch from fieldData")
//
//         if (newValue instanceof Date) {
//             fieldContext.state.value = preprocessSet(newValue);
//         }
//     },
//     { immediate: true },
// );
watch(
    [maxValueAsDateTime, valueAsDateTime],
    ([maxValue, value]) => {
        if (maxValue) {
            if (value && value > maxValue) {
                fieldContext.updateError("maxValue", `Must be ${maxValue.toISOString().split(".")[0]} or less.`);
            } else {
                fieldContext.deleteError("maxValue");
            }
        }
    },
    { immediate: true },
);
watch(
    [minValueAsDateTime, valueAsDateTime],
    ([minValue, value]) => {
        if (minValue) {
            if (value && value < minValue) {
                fieldContext.updateError("minValue", `Must be ${minValue.toISOString().split(".")[0]} or more.`);
            } else {
                fieldContext.deleteError("minValue");
            }
        }
    },
    { immediate: true },
);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-date-time">
        <slot />
    </div>
</template>
