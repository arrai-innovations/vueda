<script setup>
import "@vueda/theme/vueda-tailwind/controls/RangeCalendarNextButton.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RangeCalendarNext, useForwardProps } from "reka-ui";

/**
 * A navigation button that advances the range calendar to the next month or year.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("RangeCalendarNextButton", props);
const icon = useIcons("RangeCalendarNextButton", props);
const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RangeCalendarNext
        data-slot="range-calendar-next-button"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="forwardedProps"
    >
        <slot>
            <component
                :is="icon('chevronRight').component"
                v-if="icon('chevronRight')"
                v-bind="icon('chevronRight').props"
                aria-hidden="true"
            />
        </slot>
    </RangeCalendarNext>
</template>
