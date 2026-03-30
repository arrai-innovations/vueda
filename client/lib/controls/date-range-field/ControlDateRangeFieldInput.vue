<script setup>
import { cn } from "@vueda/utils/cn.js";
import { DateRangeFieldInput } from "reka-ui";

/**
 * A single segment of a date range field (year, month, day, hour, minute, etc.).
 * Renders an editable segment for either the start or end date inside a
 * ControlDateRangeField.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The part of the date this segment represents (e.g. "year", "month", "day"). */
    part: { type: String, required: true },
    /** Whether this segment belongs to the start or end of the range. */
    type: { type: String, required: true },
});
</script>

<template>
    <DateRangeFieldInput
        data-slot="date-range-field-input"
        :part="props.part"
        :type="props.type"
        :class="
            cn(
                'inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground',
                props.class,
            )
        "
        v-bind="$attrs"
    />
</template>
