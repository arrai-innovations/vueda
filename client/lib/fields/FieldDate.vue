<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
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
    customDateConverter: {
        type: Function,
        default: undefined,
    },
});

const parseLocalDateFromUTC = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
};

const preprocessGet = (value) => {
    if (typeof value === "string") {
        return parseLocalDateFromUTC(value);
    }
    return value;
};

const preprocessSet = (value) => {
    if (value instanceof Date) {
        if (props.customDateConverter) {
            value = props.customDateConverter(value);
        }
        return new Date(value).toISOString().split("T")[0];
    }
    return value;
};

const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit, { preprocessGet, preprocessSet });
const valueAsDate = computed(() => {
    const value = fieldContext.state.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
const maxValueAsDate = computed(() => {
    const maxValue = props.maxValue;
    if (maxValue) {
        return new Date(maxValue);
    }
    return null;
});
const minValueAsDate = computed(() => {
    const minValue = props.minValue;
    if (minValue) {
        return new Date(minValue);
    }
    return null;
});

watch(
    [maxValueAsDate, valueAsDate],
    ([maxValue, value]) => {
        if (maxValue) {
            if (value && value > maxValue) {
                fieldContext.updateError("maxValue", `Must be ${maxValue.toISOString().split("T")[0]} or less.`);
            } else {
                fieldContext.deleteError("maxValue");
            }
        }
    },
    { immediate: true },
);
watch(
    [minValueAsDate, valueAsDate],
    ([minValue, value]) => {
        if (minValue) {
            if (value && value < minValue) {
                fieldContext.updateError("minValue", `Must be ${minValue.toISOString().split("T")[0]} or more.`);
            } else {
                fieldContext.deleteError("minValue");
            }
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
