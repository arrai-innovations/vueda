<script setup>
import { cn } from "@vueda/utils/cn.js";
import { TimeFieldInput } from "reka-ui";

/**
 * A single segment of a time field (hour, minute, second, or day period).
 * Renders an editable segment inside a ControlTimeField.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The part of the time this segment represents (e.g. "hour", "minute", "second", "dayPeriod"). */
    part: { type: String, required: true },
});
</script>

<template>
    <TimeFieldInput
        data-slot="time-field-input"
        :part="props.part"
        :class="
            cn(
                'inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground',
                props.class,
            )
        "
        v-bind="$attrs"
    />
</template>
