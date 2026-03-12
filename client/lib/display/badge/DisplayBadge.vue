<script setup>
import { badgeVariants } from ".";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { Primitive } from "reka-ui";

/**
 * A badge component built on Reka UI's Primitive, supporting variant styles via cva.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('.').BadgeVariants['variant']} */
    variant: { type: String, default: undefined },
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <Primitive data-slot="badge" :class="cn(badgeVariants({ variant }), props.class)" v-bind="delegatedProps">
        <slot />
    </Primitive>
</template>
