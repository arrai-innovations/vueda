<script setup>
import { cn } from "@vueda/utils/cn.js";
import { RangeCalendarCell } from "reka-ui";

/**
 * A styled wrapper for a single range calendar cell with range selection highlights.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the cell. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <RangeCalendarCell
        data-slot="range-calendar-cell"
        :class="
            cn(
                'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md [&:has([data-selected][data-selection-end])]:rounded-r-md [&:has([data-selected][data-selection-start])]:rounded-l-md',
                props.class,
            )
        "
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarCell>
</template>
