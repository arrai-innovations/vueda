<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarHeading, useForwardProps } from "reka-ui";

/**
 * Displays the current month and year label in the range calendar header.
 * Exposes a headingValue slot prop for custom rendering.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the heading. */
    class: { type: [String, Array, Object], default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarHeading
        v-slot="{ headingValue }"
        data-slot="range-calendar-heading"
        :class="cn('text-sm font-medium', props.class)"
        v-bind="forwardedProps"
    >
        <slot :heading-value="headingValue">
            {{ headingValue }}
        </slot>
    </RangeCalendarHeading>
</template>
