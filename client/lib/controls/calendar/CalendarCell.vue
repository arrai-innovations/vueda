<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { CalendarCell } from "reka-ui";

/**
 * A styled wrapper for a single calendar cell, adding selection highlight and focus handling.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the cell. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("CalendarCell", props);
</script>

<template>
    <CalendarCell data-slot="calendar-cell" :class="[theme('root'), props.class]" v-bind="$attrs">
        <slot />
    </CalendarCell>
</template>
