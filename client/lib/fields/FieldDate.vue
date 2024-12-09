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
    customDateConverter: {
        type: Function,
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
    const parsed = DateTime.fromISO(value, { zone: "local" });
    return parsed.isValid ? parsed.toJSDate() : null;
};

const preprocessSet = (value) => {
    if (value instanceof Date) {
        const dt = DateTime.fromJSDate(value, { zone: "local" });
        const formatted = dt.toISODate(); // Returns date in "yyyy-MM-dd" format
        return props.customDateConverter ? props.customDateConverter(formatted) : formatted;
    }
    return value;
};

const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit, { preprocessGet, preprocessSet });

const valueAsDate = computed(() => {
    return preprocessGet(fieldContext.state.value);
});

const maxValueAsDate = computed(() => {
    return preprocessGet(props.maxValue);
});

const minValueAsDate = computed(() => {
    return preprocessGet(props.minValue);
});

const formatDate = (date) => {
    if (!date) {
        return "";
    }
    return DateTime.fromJSDate(date, { zone: "local" }).toISODate();
};

watch(
    [maxValueAsDate, valueAsDate],
    ([maxValue, value]) => {
        if (maxValue && value && value > maxValue) {
            fieldContext.updateError("maxValue", `Must be ${formatDate(maxValue)} or less.`);
        } else {
            fieldContext.deleteError("maxValue");
        }
    },
    { immediate: true },
);

watch(
    [minValueAsDate, valueAsDate],
    ([minValue, value]) => {
        if (minValue && value && value < minValue) {
            fieldContext.updateError("minValue", `Must be ${formatDate(minValue)} or more.`);
        } else {
            fieldContext.deleteError("minValue");
        }
    },
    { immediate: true },
);
</script>

<template>
    <div :class="$attrs.class" data-qa="field-date">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
