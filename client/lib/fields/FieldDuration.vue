<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useDevTypeGuard } from "@vueda/use/validation/useDevTypeGuard.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for duration values represented as plain objects. Warns in
 * development if the value is not a plain object, and exposes step and unit
 * hints for the rendering widget.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    /** The maximum duration boundary; accepts a Date object or a string. */
    maxValue: {
        type: [Date, String],
        default: undefined,
    },
    /** The minimum duration boundary; accepts a Date object or a string. */
    minValue: {
        type: [Date, String],
        default: undefined,
    },
    /** The increment step expressed in seconds. */
    step: {
        type: Number,
        default: 60,
    },
    /** The display unit used by the rendering widget (e.g. "minutes" or "hours"). */
    unit: {
        type: String,
        default: "minutes",
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
useDevTypeGuard(fieldContext, (value) =>
    typeof value !== "object" || Array.isArray(value) ? `Expected value to be a plain object for duration, got:` : null,
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-duration">
        <!-- Renders the duration input widget; receives field-attrs (non-class inherited attributes) and field-props. -->
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
