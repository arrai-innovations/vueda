<script setup>
import "@vueda/theme/vueda-tailwind/controls/TimeFieldInput.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { TimeFieldInput } from "reka-ui";

/**
 * A single segment of a time field (hour, minute, second, or day period).
 * Renders an editable segment inside a TimeField.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The part of the time this segment represents (e.g. "hour", "minute", "second", "dayPeriod"). */
    part: { type: String, required: true },
});

const theme = useTheme("TimeFieldInput", props);
</script>

<template>
    <TimeFieldInput
        data-slot="time-field-input"
        :part="props.part"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        v-bind="$attrs"
        ><slot
    /></TimeFieldInput>
</template>
