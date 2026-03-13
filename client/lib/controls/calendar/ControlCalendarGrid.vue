<script setup>
import { cn } from "@vueda/utils/cn.js";
import { CalendarGrid } from "reka-ui";

/**
 * A styled wrapper for the calendar grid table that contains weeks and day cells.
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
    <CalendarGrid
        data-slot="calendar-grid"
        :class="cn('w-full border-collapse space-x-1', props.class)"
        v-bind="$attrs"
    >
        <slot />
    </CalendarGrid>
</template>
