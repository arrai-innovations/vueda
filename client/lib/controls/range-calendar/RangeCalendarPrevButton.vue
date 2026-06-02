<script setup>
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarPrev, useForwardProps } from "reka-ui";

/**
 * A navigation button that moves the range calendar to the previous month or year.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("RangeCalendarPrevButton", props);
const icon = useIcons("RangeCalendarPrevButton");
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarPrev
        data-slot="range-calendar-prev-button"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="forwardedProps"
    >
        <slot>
            <component
                :is="icon('chevronLeft').component"
                v-if="icon('chevronLeft')"
                v-bind="icon('chevronLeft').props"
                aria-hidden="true"
            />
        </slot>
    </RangeCalendarPrev>
</template>
