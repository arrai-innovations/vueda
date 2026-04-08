<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronLeft } from "lucide-vue-next";
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

const theme = useTheme("ControlRangeCalendarPrevButton", props);
const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarPrev
        data-slot="range-calendar-prev-button"
        :class="[theme('root'), props.class]"
        v-bind="forwardedProps"
    >
        <slot>
            <ChevronLeft class="size-4" />
        </slot>
    </RangeCalendarPrev>
</template>
