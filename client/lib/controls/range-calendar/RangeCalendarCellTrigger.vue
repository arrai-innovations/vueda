<script setup>
import "@vueda/theme/vueda-tailwind/controls/RangeCalendarCellTrigger.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarCellTrigger, useForwardProps } from "reka-ui";

/**
 * The interactive trigger button within a range calendar cell that handles day selection.
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

const theme = useTheme("RangeCalendarCellTrigger", props);
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarCellTrigger
        data-slot="range-calendar-trigger"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="forwardedProps"
    >
        <slot />
    </RangeCalendarCellTrigger>
</template>
