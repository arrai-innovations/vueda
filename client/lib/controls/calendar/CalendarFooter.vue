<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A chin below Calendar / RangeCalendar that surfaces a range summary
 * label and apply / clear actions. The default slot replaces the layout
 * entirely; the named `summary` slot fills the leading mono summary line
 * and `actions` fills the trailing button row.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("CalendarFooter", props);
</script>

<template>
    <div data-slot="calendar-footer" :class="[theme('root'), props.class]">
        <slot>
            <span data-slot="calendar-footer-summary" :class="theme('summary')">
                <!-- @slot summary Leading mono summary label, typically the selected range and its day count. -->
                <slot name="summary" />
            </span>
            <!-- @slot actions Trailing button row, typically apply / clear. -->
            <slot name="actions" />
        </slot>
    </div>
</template>
