<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { RangeCalendarGridRow } from "reka-ui";

/**
 * A styled row within the range calendar grid representing a single week.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the grid row. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("RangeCalendarGridRow", props);
</script>

<template>
    <RangeCalendarGridRow
        data-slot="range-calendar-grid-row"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
    >
        <slot />
    </RangeCalendarGridRow>
</template>
