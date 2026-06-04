<script setup>
import "@vueda/theme/vueda-tailwind/controls/CalendarGrid.theme.js";
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
    <CalendarGrid
        data-slot="calendar-grid"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
    >
        <slot />
    </CalendarGrid>
</template>
