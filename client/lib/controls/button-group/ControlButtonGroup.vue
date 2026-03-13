<script setup>
import { buttonGroupVariants } from ".";
import { cn } from "@vueda/utils/cn.js";

/**
 * A container that groups related buttons into a single visual unit.
 * Applies border-radius and border adjustments to adjacent children based on orientation.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the group container. */
    class: { type: [String, Array, Object], default: undefined },
    /** The layout direction of the group. */
    orientation: { type: String, default: undefined },
});
</script>

<template>
    <div
        role="group"
        data-slot="button-group"
        :data-orientation="props.orientation"
        :class="cn(buttonGroupVariants({ orientation: props.orientation }), props.class)"
    >
        <slot />
    </div>
</template>
