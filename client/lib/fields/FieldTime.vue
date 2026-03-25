<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import { useTimeValidation } from "@vueda/use/validation/useTimeValidation.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";

/**
 * Field component for time values in HH:mm:ss format. Enforces optional
 * minimum, maximum, and step constraints and validates the time string format.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** The latest time allowed; accepts a Date object or an HH:mm:ss string. */
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    /** The earliest time allowed; accepts a Date object or an HH:mm:ss string. */
    minValue: {
        type: [Date, String],
        default: undefined,
    },
    /** The increment step in seconds; the time value must be a multiple of this step. */
    step: {
        type: Number,
        default: undefined,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useTimeValidation(fieldContext, props);
useDevTypeGuard(fieldContext, (value) => {
    if (typeof value !== "string") {
        return `Expected value to be a string (HH:mm:ss), got:`;
    }
    const parsed = DateTime.fromFormat(value, "HH:mm:ss");
    if (!parsed.isValid) {
        return `Value is a string but not a valid HH:mm:ss time:`;
    }
    return null;
});
</script>
<template>
    <div :class="$attrs.class" data-qa="field-time">
        <!-- Renders the time input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
