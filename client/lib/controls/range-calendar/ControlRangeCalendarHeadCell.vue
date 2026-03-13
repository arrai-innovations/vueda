<script setup>
import { cn } from "@vueda/utils/cn.js";
import { RangeCalendarHeadCell } from "reka-ui";

/**
 * A styled header cell displaying a day-of-week abbreviation in the range calendar grid.
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
    <RangeCalendarHeadCell
        data-slot="range-calendar-head-cell"
        :class="cn('w-8 rounded-md text-[0.8rem] font-normal text-muted-foreground', props.class)"
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarHeadCell>
</template>
