<script setup>
import { buttonVariants } from ".";
import { cn } from "@vueda/utils/cn.js";
import { Primitive } from "reka-ui";

/**
 * A button control built on Reka UI's Primitive, supporting variant and size styles via cva.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('.').ButtonVariants['variant']} */
    variant: { type: String, default: undefined },
    /** @type {import('.').ButtonVariants['size']} */
    size: { type: String, default: undefined },
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <Primitive
        data-slot="button"
        :data-variant="variant"
        :data-size="size"
        :as="as"
        :as-child="asChild"
        :class="cn(buttonVariants({ variant, size }), props.class)"
    >
        <slot />
    </Primitive>
</template>
