<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * Internal primitive element for NavigationSidebarMenuButton.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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

const theme = useTheme(
    "NavigationSidebarMenuButtonChild",
    props,
    reactive({
        variant: toRef(props, "variant"),
        size: toRef(props, "size"),
    }),
);
</script>

<template>
    <Primitive
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        :data-size="size"
        :data-active="isActive"
        :class="[theme('root'), props.class]"
        :as="as"
        :as-child="asChild"
        v-bind="$attrs"
    >
        <slot />
    </Primitive>
</template>
