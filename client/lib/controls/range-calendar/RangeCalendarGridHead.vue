<script setup>
import { RangeCalendarGridHead } from "reka-ui";

/**
 * A wrapper for the range calendar grid's header element containing day-of-week labels.
 */
defineOptions({
    inheritAttrs: false,
});
</script>

<template>
    <RangeCalendarGridHead data-slot="range-calendar-grid-head" v-bind="$attrs">
        <slot />
    </RangeCalendarGridHead>
</template>
