<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
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

const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const parseToDate = (value) => {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    const dt = DateTime.fromISO(value, { zone: "local" });
    return dt.isValid ? dt.toJSDate() : null;
};

const valueAsDate = computed(() => {
    return parseToDate(fieldContext.state.value);
});
const maxValueAsDate = computed(() => {
    return parseToDate(props.maxValue);
});
const minValueAsDate = computed(() => {
    return parseToDate(props.minValue);
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
watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined) {
            if (typeof value !== "string") {
                logger.warn(`Expected value to be a string (YYYY-MM-DD), got:`, value);
            } else {
                const parsed = DateTime.fromISO(value, { zone: "local" });
                if (!parsed.isValid || value.length !== 10) {
                    // "2024-04-27" is 10 characters
                    logger.warn(`Value is a string but not a valid ISO date (YYYY-MM-DD):`, value);
                }
            }
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
