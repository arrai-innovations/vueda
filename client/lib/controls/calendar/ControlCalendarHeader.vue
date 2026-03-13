<script setup>
import { cn } from "@vueda/utils/cn.js";
import { CalendarHeader } from "reka-ui";

/**
 * The header bar of the calendar containing navigation buttons and the month/year heading.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Additional CSS classes to apply to the header. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <CalendarHeader
        data-slot="calendar-header"
        :class="cn('flex justify-center pt-1 relative items-center w-full px-8', props.class)"
        v-bind="$attrs"
    >
        <slot />
    </CalendarHeader>
</template>
