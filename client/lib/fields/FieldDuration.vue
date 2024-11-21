<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { isObject } from "lodash-es";
import isString from "lodash-es/isString.js";

defineOptions({
    inheritAttrs: false,
});
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
    unit: {
        type: String,
        default: "minutes",
        description: "The unit of the duration.",
    },
});
const emit = defineEmits([...FIELD_EMITS]);

const parseDuration = (durationString) => {
    const match = durationString.match(/^(?:(\d+)\s+)?(\d{2}):(\d{2}):(\d{2})$/);
    let days = parseInt(match[1] || "0", 10);
    let hours = parseInt(match[2], 10);
    let minutes = parseInt(match[3], 10);
    let seconds = parseInt(match[4], 10);
    if (props.unit === "hours") {
        hours = hours + days * 24;
        days = 0;
    } else if (props.unit === "minutes") {
        minutes = minutes + hours * 60 + days * 24 * 60;
        hours = 0;
        days = 0;
    } else if (props.unit === "seconds") {
        seconds = seconds + minutes * 60 + hours * 60 * 60 + days * 24 * 60 * 60;
        minutes = 0;
        hours = 0;
        days = 0;
    }
    if (match) {
        return {
            days,
            hours,
            minutes,
            seconds,
        };
    }
    return null;
};

const convertDurationToString = (durationObject) => {
    const padWithZero = (num) => String(num).padStart(2, "0");
    const days = padWithZero(durationObject.days || 0);
    const hours = padWithZero(durationObject.hours || 0);
    const minutes = padWithZero(durationObject.minutes || 0);
    const seconds = padWithZero(durationObject.seconds || 0);
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
        <slot :field-attrs="$attrs" :field-props="props" />
    </div>
</template>
