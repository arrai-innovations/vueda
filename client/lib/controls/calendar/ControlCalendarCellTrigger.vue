<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CalendarCellTrigger, useForwardProps } from "reka-ui";

/**
 * The interactive trigger button within a calendar cell that handles day selection.
 * Applies button ghost styling with additional state-based modifiers for selection, disabled, and unavailable states.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the trigger button. */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** Whether to render as the child element (slot passthrough). */
    asChild: { type: Boolean, default: undefined },
});

const theme = useTheme("ControlCalendarCellTrigger", props);
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <CalendarCellTrigger
        data-slot="calendar-cell-trigger"
        :class="[theme('root'), props.class]"
        v-bind="forwardedProps"
    >
        <slot />
    </CalendarCellTrigger>
</template>
