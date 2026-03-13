<script setup>
import { buttonVariants } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronLeft } from "lucide-vue-next";
import { RangeCalendarPrev, useForwardProps } from "reka-ui";

/**
 * A navigation button that moves the range calendar to the previous month or year.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarPrev
        data-slot="range-calendar-prev-button"
        :class="
            cn(
                buttonVariants({ variant: 'outline' }),
                'absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                props.class,
            )
        "
        v-bind="forwardedProps"
    >
        <slot>
            <ChevronLeft class="size-4" />
        </slot>
    </RangeCalendarPrev>
</template>
