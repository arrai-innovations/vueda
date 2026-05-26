<script setup>
import { CalendarGridHead } from "reka-ui";

/**
 * A wrapper for the calendar grid's header element containing day-of-week labels.
 */
defineOptions({
    inheritAttrs: false,
});

defineProps({
    /** Additional CSS classes to apply to the grid head. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <CalendarGridHead data-slot="calendar-grid-head" v-bind="$attrs">
        <slot />
    </CalendarGridHead>
</template>
