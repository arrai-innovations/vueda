<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { CalendarGrid } from "reka-ui";

/**
 * A styled wrapper for the calendar grid table that contains weeks and day cells.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the grid. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("CalendarGrid", props);
</script>

<template>
    <CalendarGrid data-slot="calendar-grid" :class="[theme('root'), props.class]" v-bind="$attrs">
        <slot />
    </CalendarGrid>
</template>
