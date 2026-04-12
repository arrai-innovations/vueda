<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DateRangeFieldRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A segment-based date range input built on Reka UI's DateRangeFieldRoot.
 * Renders start and end date segments that users tab through individually.
 * Supports granularity for date-only or datetime range input.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled date range value. Can be bound as v-model. */
    modelValue: { type: Object, default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: Object, default: undefined },
    /** The placeholder date used to determine initial display when no value is set. */
    placeholder: { type: Object, default: undefined },
    /** The default placeholder date. */
    defaultPlaceholder: { type: Object, default: undefined },
    /** The granularity of the date field (e.g. "day", "hour", "minute", "second"). */
    granularity: { type: String, default: undefined },
    /** The hour cycle for time formatting (12 or 24). */
    hourCycle: { type: Number, default: undefined },
    /** The stepping interval for time fields. */
    step: { type: Object, default: undefined },
    /** Whether to hide the time zone segment. */
    hideTimeZone: { type: Boolean, default: undefined },
    /** The maximum selectable date. */
    maxValue: { type: Object, default: undefined },
    /** The minimum selectable date. */
    minValue: { type: Object, default: undefined },
    /** The locale used for formatting dates. */
    locale: { type: String, default: undefined },
    /** When true, prevents interaction with the date field. */
    disabled: { type: Boolean, default: undefined },
    /** When true, the field is read-only. */
    readonly: { type: Boolean, default: undefined },
    /** A function that returns whether a date is unavailable. */
    isDateUnavailable: { type: Function, default: undefined },
    /** The id of the underlying element. */
    id: { type: String, default: undefined },
    /** The name submitted with form data. */
    name: { type: String, default: undefined },
    /** When true, the field is required. */
    required: { type: Boolean, default: false },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const emits = defineEmits(["update:modelValue", "update:placeholder"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlDateRangeField", props);
</script>

<template>
    <DateRangeFieldRoot
        v-slot="slotProps"
        data-slot="date-range-field"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </DateRangeFieldRoot>
</template>
