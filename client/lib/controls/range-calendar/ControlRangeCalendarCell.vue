<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { RangeCalendarCell } from "reka-ui";

/**
 * A styled wrapper for a single range calendar cell with range selection highlights.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the cell. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlRangeCalendarCell", props);
</script>

<template>
    <RangeCalendarCell data-slot="range-calendar-cell" :class="[theme('root'), props.class]" v-bind="$attrs">
        <slot />
    </RangeCalendarCell>
</template>
