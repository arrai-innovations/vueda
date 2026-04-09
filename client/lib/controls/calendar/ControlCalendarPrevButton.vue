<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CalendarPrev, useForwardProps } from "reka-ui";

/**
 * A navigation button that moves the calendar to the previous month or year.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlCalendarNavButton", props);
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <CalendarPrev data-slot="calendar-prev-button" :class="[theme('root'), props.class]" v-bind="forwardedProps">
        <slot>
            <span aria-hidden="true" class="select-none">‹</span>
        </slot>
    </CalendarPrev>
</template>
