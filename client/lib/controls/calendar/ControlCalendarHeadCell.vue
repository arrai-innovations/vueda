<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { CalendarHeadCell } from "reka-ui";

/**
 * A styled header cell displaying a day-of-week abbreviation in the calendar grid.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the head cell. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlCalendarHeadCell", props);
</script>

<template>
    <CalendarHeadCell data-slot="calendar-head-cell" :class="[theme('root'), props.class]" v-bind="$attrs">
        <slot />
    </CalendarHeadCell>
</template>
