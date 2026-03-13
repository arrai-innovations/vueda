<script setup>
import { cn } from "@vueda/utils/cn.js";
import { RangeCalendarHeader } from "reka-ui";

/**
 * The header bar of the range calendar containing navigation buttons and the month/year heading.
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
    <RangeCalendarHeader
        data-slot="range-calendar-header"
        :class="cn('flex justify-center pt-1 relative items-center w-full', props.class)"
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarHeader>
</template>
