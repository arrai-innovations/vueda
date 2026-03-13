<script setup>
import { inputGroupButtonVariants } from ".";
import { ControlButton } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";

/**
 * A sized button variant designed for inline placement within an input group.
 */
defineOptions({});

const props = defineProps({
    /** The button style variant. */
    variant: { type: String, default: "ghost" },
    /** The size variant for the button within the input group. */
    size: { type: String, default: "xs" },
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ControlButton
        :data-size="props.size"
        :variant="props.variant"
        :class="cn(inputGroupButtonVariants({ size: props.size }), props.class)"
    >
        <slot />
    </ControlButton>
</template>
