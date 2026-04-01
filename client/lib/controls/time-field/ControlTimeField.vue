<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { TimeFieldRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A segment-based time input built on Reka UI's TimeFieldRoot. Users tab
 * through individual hour, minute, and optional second segments. Supports
 * 12-hour and 24-hour formats via the hourCycle prop.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled time value. Can be bound as v-model. */
    modelValue: { type: Object, default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: Object, default: undefined },
    /** The placeholder time used to determine initial display when no value is set. */
    placeholder: { type: Object, default: undefined },
    /** The default placeholder time. */
    defaultPlaceholder: { type: Object, default: undefined },
    /** The granularity of the time field ("hour", "minute", or "second"). */
    granularity: { type: String, default: undefined },
    /** The hour cycle for time formatting (12 or 24). */
    hourCycle: { type: Number, default: undefined },
    /** The stepping interval for the time segments. */
    step: { type: Object, default: undefined },
    /** Whether to enforce snapping the value to the nearest step increment. */
    stepSnapping: { type: Boolean, default: undefined },
    /** Whether to hide the time zone segment. */
    hideTimeZone: { type: Boolean, default: undefined },
    /** The maximum selectable time. */
    maxValue: { type: Object, default: undefined },
    /** The minimum selectable time. */
    minValue: { type: Object, default: undefined },
    /** The locale used for formatting times. */
    locale: { type: String, default: undefined },
    /** When true, prevents interaction with the time field. */
    disabled: { type: Boolean, default: undefined },
    /** When true, the field is read-only. */
    readonly: { type: Boolean, default: undefined },
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

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <TimeFieldRoot
        v-slot="slotProps"
        data-slot="time-field"
        v-bind="forwarded"
        :class="
            cn(
                'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                props.class,
            )
        "
    >
        <slot v-bind="slotProps" />
    </TimeFieldRoot>
</template>
