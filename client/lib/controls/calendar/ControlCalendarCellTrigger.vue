<script setup>
import { buttonVariants } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { CalendarCellTrigger, useForwardProps } from "reka-ui";

/**
 * The interactive trigger button within a calendar cell that handles day selection.
 * Applies button ghost styling with additional state-based modifiers for selection, disabled, and unavailable states.
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
    <CalendarCellTrigger
        data-slot="calendar-cell-trigger"
        :class="
            cn(
                buttonVariants({ variant: 'ghost' }),
                'size-8 p-0 font-normal aria-selected:opacity-100 cursor-default',
                '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
                // Selected
                'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground',
                // Disabled
                'data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
                // Unavailable
                'data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through',
                // Outside months
                'data-[outside-view]:text-muted-foreground',
                props.class,
            )
        "
        v-bind="forwardedProps"
    >
        <slot />
    </CalendarCellTrigger>
</template>
