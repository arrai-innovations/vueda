<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";
import { computed, watch } from "vue";

/**
 * Field component for datetime values (ISO 8601 strings). Enforces optional
 * minimum and maximum datetime bounds and validates the ISO datetime format.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** The latest datetime allowed; accepts a Date object or an ISO datetime string. */
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    /** The earliest datetime allowed; accepts a Date object or an ISO datetime string. */
    minValue: {
        type: [Date, String],
        default: undefined,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const parseToDateTime = (value) => {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    const dt = DateTime.fromISO(value, { zone: "local" });
    return dt.isValid ? dt.toJSDate() : null;
};

const formatDateTime = (date) => {
    if (!date) {
        return "";
    }
    return DateTime.fromJSDate(date).toISO({ suppressMilliseconds: true });
};

const valueAsDateTime = computed(() => parseToDateTime(fieldContext.state.value));
const maxValueAsDateTime = computed(() => parseToDateTime(props.maxValue));
const minValueAsDateTime = computed(() => parseToDateTime(props.minValue));
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
watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined) {
            if (typeof value !== "string") {
                logger.warn(`Expected value to be a string (ISO datetime), got:`, value);
            } else {
                const parsed = DateTime.fromISO(value, { zone: "local" });
                if (!parsed.isValid) {
                    logger.warn(`Value is a string but not a valid ISO datetime:`, value);
                }
            }
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-date-time">
        <!-- Renders the datetime input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
