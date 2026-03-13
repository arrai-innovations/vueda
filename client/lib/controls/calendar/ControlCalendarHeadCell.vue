<script setup>
import { cn } from "@vueda/utils/cn.js";
import { CalendarHeadCell } from "reka-ui";

/**
 * A styled header cell displaying a day-of-week abbreviation in the calendar grid.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the head cell. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <CalendarHeadCell
        data-slot="calendar-head-cell"
        :class="cn('text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]', props.class)"
        v-bind="$attrs"
    >
        <slot />
    </CalendarHeadCell>
</template>
