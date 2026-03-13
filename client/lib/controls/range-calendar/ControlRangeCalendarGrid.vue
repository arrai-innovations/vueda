<script setup>
import { cn } from "@vueda/utils/cn.js";
import { RangeCalendarGrid } from "reka-ui";

/**
 * A styled wrapper for the range calendar grid table containing weeks and day cells.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the grid. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <RangeCalendarGrid
        data-slot="range-calendar-grid"
        :class="cn('w-full border-collapse space-x-1', props.class)"
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarGrid>
</template>
