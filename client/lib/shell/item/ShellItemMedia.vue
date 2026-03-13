<script setup>
import { itemMediaVariants } from ".";
import { cn } from "@vueda/utils/cn.js";

/**
 * A media slot inside a ShellItem for icons or images, with variant-based sizing and styling.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the media container. */
    class: { type: [String, Array, Object], default: undefined },
    /** The visual style variant controlling size and appearance. */
    variant: { type: String, default: undefined },
});
</script>

<template>
    <div data-slot="item-media" :data-variant="props.variant" :class="cn(itemMediaVariants({ variant }), props.class)">
        <slot />
    </div>
</template>
