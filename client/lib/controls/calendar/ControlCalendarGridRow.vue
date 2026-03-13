<script setup>
import { cn } from "@vueda/utils/cn.js";
import { CalendarGridRow } from "reka-ui";

/**
 * A styled row within the calendar grid representing a single week.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the grid row. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <CalendarGridRow data-slot="calendar-grid-row" :class="cn('flex', props.class)" v-bind="$attrs">
        <slot />
    </CalendarGridRow>
</template>
