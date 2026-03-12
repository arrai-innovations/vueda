<script setup>
import { toggleVariants } from ".";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { Toggle, useForwardPropsEmits } from "reka-ui";

/**
 * A toggle button built on Reka UI's Toggle, supporting variant and size styles via cva.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** @type {import('.').ToggleVariants['variant']} */
    variant: { type: String, default: "default" },
    /** @type {import('.').ToggleVariants['size']} */
    size: { type: String, default: "default" },
    /** Whether the toggle is pressed. */
    pressed: { type: Boolean, default: undefined },
    /** The default pressed state. */
    defaultPressed: { type: Boolean, default: undefined },
    /** Whether the toggle is disabled. */
    disabled: { type: Boolean, default: false },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const emits = defineEmits(["update:pressed"]);

const delegatedProps = reactiveOmit(props, "class", "size", "variant");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <Toggle
        v-slot="slotProps"
        data-slot="toggle"
        v-bind="forwarded"
        :class="cn(toggleVariants({ variant, size }), props.class)"
    >
        <slot v-bind="slotProps" />
    </Toggle>
</template>
