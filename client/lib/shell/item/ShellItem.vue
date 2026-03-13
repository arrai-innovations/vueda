<script setup>
import { itemVariants } from ".";
import { cn } from "@vueda/utils/cn.js";
import { Primitive } from "reka-ui";

/**
 * A flexible list item container that supports visual variants and sizes.
 * Renders via the Reka UI Primitive for polymorphic element support.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the item. */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: "div" },
    /** Whether to render as the child element (slot passthrough). */
    asChild: { type: Boolean, default: undefined },
    /** The visual style variant of the item. */
    variant: { type: String, default: undefined },
    /** The size preset of the item. */
    size: { type: String, default: undefined },
});
</script>

<template>
    <Primitive
        data-slot="item"
        :data-variant="variant"
        :data-size="size"
        :as="as"
        :as-child="asChild"
        :class="cn(itemVariants({ variant, size }), props.class)"
    >
        <slot />
    </Primitive>
</template>
