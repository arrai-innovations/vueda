<script setup>
import { sidebarMenuButtonVariants } from "./index.js";
import { cn } from "@vueda/utils/cn.js";
import { Primitive } from "reka-ui";

/**
 * Internal primitive element for NavigationSidebarMenuButton.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
    /** The style variant. */
    variant: { type: String, default: "default" },
    /** The size variant. */
    size: { type: String, default: "default" },
    /** Whether the button represents the current active item. */
    isActive: { type: Boolean, default: false },
});
</script>

<template>
    <Primitive
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        :data-size="size"
        :data-active="isActive"
        :class="cn(sidebarMenuButtonVariants({ variant, size }), props.class)"
        :as="as"
        :as-child="asChild"
        v-bind="$attrs"
    >
        <slot />
    </Primitive>
</template>
