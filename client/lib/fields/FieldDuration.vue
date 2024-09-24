<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { isObject } from "lodash-es";
import isString from "lodash-es/isString.js";

const props = defineProps({
    ...FIELD_PROPS,
    trim: {
        type: Boolean,
        default: false,
    },
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

const parseDuration = (durationString) => {
    const match = durationString.match(/^(?:(\d+)\s+)?(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
        return {
            days: parseInt(match[1] || "0", 10),
            hours: parseInt(match[2], 10),
            minutes: parseInt(match[3], 10),
            seconds: parseInt(match[4], 10),
        };
    }
    return null;
};

const convertDurationToString = (durationObject) => {
    const padWithZero = (num) => String(num).padStart(2, "0");
    const days = durationObject.days;
    const hours = padWithZero(durationObject.hours);
    const minutes = padWithZero(durationObject.minutes);
    const seconds = padWithZero(durationObject.seconds);
    return `${days} ${hours}:${minutes}:${seconds}`;
};
const preprocessGet = (value) => {
    if (isString(value)) {
        return parseDuration(value);
    }
    return value;
};
const preprocessSet = (value) => {
    if (isObject(value)) {
        return convertDurationToString(value);
    }
    return value;
};
const fieldContext = useField(props, emit, { preprocessSet, preprocessGet });

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-string">
        <slot />
    </div>
</template>
