<script setup>
import "@vueda/theme/vueda-tailwind/controls/CalendarHeading.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CalendarHeading, useForwardProps } from "reka-ui";

/**
 * Displays the current month and year label in the calendar header.
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

const theme = useTheme("CalendarHeading", props);
</script>

<template>
    <CalendarHeading
        v-slot="{ headingValue }"
        data-slot="calendar-heading"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot :heading-value="headingValue">
            {{ headingValue }}
        </slot>
    </CalendarHeading>
</template>
