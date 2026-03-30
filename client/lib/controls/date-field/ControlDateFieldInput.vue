<script setup>
import { cn } from "@vueda/utils/cn.js";
import { DateFieldInput } from "reka-ui";

/**
 * A single segment of a date field (year, month, day, hour, minute, etc.).
 * Renders an editable segment inside a ControlDateField.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The part of the date this segment represents (e.g. "year", "month", "day"). */
    part: { type: String, required: true },
});
</script>

<template>
    <DateFieldInput
        data-slot="date-field-input"
        :part="props.part"
        :class="
            cn(
                'inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground',
                props.class,
            )
        "
        v-bind="$attrs"
    />
</template>
