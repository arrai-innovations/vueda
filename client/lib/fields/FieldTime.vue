<script setup>
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";
import { computed, toRef, watch } from "vue";

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
    step: {
        type: Number,
        default: undefined,
        description: "The step in seconds.",
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });
/**
 * Convert a time string or Date object to a comparable value.
 * @param {String|Date} time - The time to convert.
 * @returns {Number|null} The comparable value.
 */
const timeToComparableValue = (time) => {
    if (!time) {
        return null;
    }
    if (typeof time === "string") {
        const parsed = DateTime.fromFormat(time, "HH:mm:ss");
        if (parsed.isValid) {
            return parsed.hour * 3600 + parsed.minute * 60 + parsed.second;
        }
        return null;
    }
    if (time instanceof Date) {
        return time.getUTCHours() * 3600 + time.getUTCMinutes() * 60 + time.getUTCSeconds();
    }
    return null;
};

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
watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined) {
            if (typeof value !== "string") {
                logger.warn(`Expected value to be a string (HH:mm:ss), got:`, value);
            } else {
                const parsed = DateTime.fromFormat(value, "HH:mm:ss");
                if (!parsed.isValid) {
                    logger.warn(`Value is a string but not a valid HH:mm:ss time:`, value);
                }
            }
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-time">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
