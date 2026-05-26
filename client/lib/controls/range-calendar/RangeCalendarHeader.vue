<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { RangeCalendarHeader } from "reka-ui";

/**
 * The header bar of the range calendar containing navigation buttons and the month/year heading.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the header. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("RangeCalendarHeader", props);
</script>

<template>
    <RangeCalendarHeader data-slot="range-calendar-header" :class="[theme('root'), props.class]" v-bind="$attrs">
        <slot />
    </RangeCalendarHeader>
</template>
