<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";
import { computed, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
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
    if (!value || value === "") {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    const parsed = DateTime.fromISO(value);
    return parsed.isValid ? parsed.toJSDate() : null;
};

const preprocessSet = (value) => (value instanceof Date ? DateTime.fromJSDate(value).toISO() : value);
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit, { preprocessGet, preprocessSet });
const formatDateTime = (date) => {
    if (!date) {
        return "";
    }
    return DateTime.fromJSDate(date).toISO({ suppressMilliseconds: true });
};
const valueAsDateTime = computed(() => {
    const value = fieldContext.state.value;
    if (value) {
        return new Date(value);
    }
    return null;
});
const maxValueAsDateTime = computed(() => {
    return preprocessGet(props.maxValue);
});

const minValueAsDateTime = computed(() => {
    return preprocessGet(props.minValue);
});
watch(
    [maxValueAsDateTime, valueAsDateTime],
    ([maxValue, value]) => {
        if (maxValue && value && value > maxValue) {
            fieldContext.updateError("maxValue", `Must be ${formatDateTime(maxValue)} or less.`);
        } else {
            fieldContext.deleteError("maxValue");
        }
    },
    { immediate: true },
);
watch(
    [minValueAsDateTime, valueAsDateTime],
    ([minValue, value]) => {
        if (minValue && value && value < minValue) {
            fieldContext.updateError("minValue", `Must be ${formatDateTime(minValue)} or more.`);
        } else {
            fieldContext.deleteError("minValue");
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-date-time">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
