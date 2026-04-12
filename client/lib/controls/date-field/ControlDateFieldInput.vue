<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { DateFieldInput } from "reka-ui";

/**
 * A single segment of a date field (year, month, day, hour, minute, etc.).
 * Renders an editable segment inside a ControlDateField.
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
    /** The part of the date this segment represents (e.g. "year", "month", "day"). */
    part: { type: String, required: true },
});

const theme = useTheme("ControlDateFieldInput", props);
</script>

<template>
    <DateFieldInput
        data-slot="date-field-input"
        :part="props.part"
        :class="[theme('root'), props.class]"
        v-bind="$attrs"
    />
</template>
