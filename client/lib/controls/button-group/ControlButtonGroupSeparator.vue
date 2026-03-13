<script setup>
import { ShellSeparator } from "@vueda/shell/separator";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * A visual divider placed between items in a ControlButtonGroup.
 * Stretches to fill the button group's cross-axis.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the separator. */
    class: { type: [String, Array, Object], default: undefined },
    /** The orientation of the separator line. */
    orientation: { type: String, default: "vertical" },
    /** Whether the separator is purely decorative (hidden from assistive tech). */
    decorative: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <ShellSeparator
        data-slot="button-group-separator"
        v-bind="delegatedProps"
        :orientation="props.orientation"
        :class="cn('bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto', props.class)"
    />
</template>
