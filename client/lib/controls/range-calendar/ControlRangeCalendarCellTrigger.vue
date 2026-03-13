<script setup>
import { buttonVariants } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarCellTrigger, useForwardProps } from "reka-ui";

/**
 * The interactive trigger button within a range calendar cell that handles day selection.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the trigger button. */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** Whether to render as the child element (slot passthrough). */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarCellTrigger
        data-slot="range-calendar-trigger"
        :class="
            cn(
                buttonVariants({ variant: 'ghost' }),
                'h-8 w-8 p-0 font-normal data-[selected]:opacity-100',
                '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
                'data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground',
                'data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground',
                'data-[outside-view]:text-muted-foreground',
                'data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
                'data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through',
                props.class,
            )
        "
        v-bind="forwardedProps"
    >
        <slot />
    </RangeCalendarCellTrigger>
</template>
