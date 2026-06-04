<script setup>
import "@vueda/theme/vueda-tailwind/controls/RangeCalendarGrid.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { RangeCalendarGrid } from "reka-ui";

/**
 * A styled wrapper for the range calendar grid table containing weeks and day cells.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the grid. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("RangeCalendarGrid", props);
</script>

<template>
    <RangeCalendarGrid
        data-slot="range-calendar-grid"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarGrid>
</template>
