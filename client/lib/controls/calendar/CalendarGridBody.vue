<script setup>
import { CalendarGridBody } from "reka-ui";

/**
 * A wrapper for the calendar grid's body element containing week rows.
 */
defineOptions({
    inheritAttrs: false,
});
</script>

<template>
    <CalendarGridBody data-slot="calendar-grid-body" v-bind="$attrs">
        <slot />
    </CalendarGridBody>
</template>
