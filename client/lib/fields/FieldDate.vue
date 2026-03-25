<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDateTimeValidation } from "@vueda/use/validation/useDateTimeValidation.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";

/**
 * Field component for date values (YYYY-MM-DD). Enforces optional minimum and
 * maximum date bounds and validates that the value is a valid ISO date string.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...FIELD_PROPS,
    /** The latest date allowed; accepts a Date object or an ISO date string. */
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    /** The earliest date allowed; accepts a Date object or an ISO date string. */
    minValue: {
        type: [Date, String],
        default: undefined,
    },
});

const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useDateTimeValidation(fieldContext, props, { dateOnly: true });
useDevTypeGuard(fieldContext, (value) => {
    if (typeof value !== "string") {
        return `Expected value to be a string (YYYY-MM-DD), got:`;
    }
    const parsed = DateTime.fromISO(value, { zone: "local" });
    if (!parsed.isValid || value.length !== 10) {
        return `Value is a string but not a valid ISO date (YYYY-MM-DD):`;
    }
    return null;
});
</script>

<template>
    <div :class="$attrs.class" data-qa="field-date">
        <!-- Renders the date input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
