<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarHeading, useForwardProps } from "reka-ui";

/**
 * Displays the current month and year label in the range calendar header.
 * Exposes a headingValue slot prop for custom rendering.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the heading. */
    class: { type: [String, Array, Object], default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("RangeCalendarHeading", props);
</script>

<template>
    <RangeCalendarHeading
        v-slot="{ headingValue }"
        data-slot="range-calendar-heading"
        :class="[theme('root'), props.class]"
        v-bind="forwardedProps"
    >
        <slot :heading-value="headingValue">
            {{ headingValue }}
        </slot>
    </RangeCalendarHeading>
</template>
