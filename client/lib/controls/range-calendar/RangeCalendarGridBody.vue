<script setup>
import { RangeCalendarGridBody } from "reka-ui";

/**
 * A wrapper for the range calendar grid's body element containing week rows.
 */
defineOptions({
    inheritAttrs: false,
});
</script>

<template>
    <RangeCalendarGridBody data-slot="range-calendar-grid-body" v-bind="$attrs">
        <slot />
    </RangeCalendarGridBody>
</template>
