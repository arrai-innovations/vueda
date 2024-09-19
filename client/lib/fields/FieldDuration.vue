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
    const match = durationString.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
        return {
            hours: parseInt(match[1], 10),
            minutes: parseInt(match[2], 10),
            seconds: parseInt(match[3], 10),
        };
    }
    return null;
};

const convertDurationToString = (durationObject) => {
    const hours = String(durationObject.hours).padStart(2, "0");
    const minutes = String(durationObject.minutes).padStart(2, "0");
    const seconds = String(durationObject.seconds).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
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
    field
    <div data-qa="field-string">
        <slot />
    </div>
</template>
