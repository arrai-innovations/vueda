<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDateTimeValidation } from "@vueda/use/validation/useDateTimeValidation.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";

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
useDateTimeValidation(fieldContext, props);
useDevTypeGuard(fieldContext, (value) => {
    if (typeof value !== "string") {
        return `Expected value to be a string (ISO datetime), got:`;
    }
    const parsed = DateTime.fromISO(value, { zone: "local" });
    if (!parsed.isValid) {
        return `Value is a string but not a valid ISO datetime:`;
    }
    return null;
});
</script>
<template>
    <div :class="$attrs.class" data-qa="field-date-time">
        <!-- Renders the datetime input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
