<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { DateRangeFieldInput } from "reka-ui";

/**
 * A single segment of a date range field (year, month, day, hour, minute, etc.).
 * Renders an editable segment for either the start or end date inside a
 * DateRangeField.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The part of the date this segment represents (e.g. "year", "month", "day"). */
    part: { type: String, required: true },
    /** Whether this segment belongs to the start or end of the range. */
    type: { type: String, required: true },
});

const theme = useTheme("DateRangeFieldInput", props);
</script>

<template>
    <DateRangeFieldInput
        data-slot="date-range-field-input"
        :part="props.part"
        :type="props.type"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
        ><slot
    /></DateRangeFieldInput>
</template>
