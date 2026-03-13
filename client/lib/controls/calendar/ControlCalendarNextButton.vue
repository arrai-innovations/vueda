<script setup>
import { buttonVariants } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronRight } from "lucide-vue-next";
import { CalendarNext, useForwardProps } from "reka-ui";

/**
 * A navigation button that advances the calendar to the next month or year.
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
    <CalendarNext
        data-slot="calendar-next-button"
        :class="
            cn(
                buttonVariants({ variant: 'outline' }),
                'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                props.class,
            )
        "
        v-bind="forwardedProps"
    >
        <slot>
            <ChevronRight class="size-4" />
        </slot>
    </CalendarNext>
</template>
