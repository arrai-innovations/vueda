<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { CalendarHeader } from "reka-ui";

/**
 * The header bar of the calendar containing navigation buttons and the month/year heading.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the header. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlCalendarHeader", props);
</script>

<template>
    <CalendarHeader data-slot="calendar-header" :class="[theme('root'), props.class]" v-bind="$attrs">
        <slot />
    </CalendarHeader>
</template>
