<script setup>
import { cn } from "@vueda/utils/cn.js";
import { CalendarCell } from "reka-ui";

/**
 * A styled wrapper for a single calendar cell, adding selection highlight and focus handling.
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
    <CalendarCell
        data-slot="calendar-cell"
        :class="
            cn(
                'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([data-selected])]:rounded-md [&:has([data-selected])]:bg-accent',
                props.class,
            )
        "
        v-bind="$attrs"
    >
        <slot />
    </CalendarCell>
</template>
