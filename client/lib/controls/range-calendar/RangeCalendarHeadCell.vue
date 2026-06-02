<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { RangeCalendarHeadCell } from "reka-ui";

/**
 * A styled header cell displaying a day-of-week abbreviation in the range calendar grid.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the head cell. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("RangeCalendarHeadCell", props);
</script>

<template>
    <RangeCalendarHeadCell
        data-slot="range-calendar-head-cell"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarHeadCell>
</template>
