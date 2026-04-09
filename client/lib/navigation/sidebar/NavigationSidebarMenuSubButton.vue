<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * An interactive button inside a sidebar sub-menu.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "a" },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
    /** The size variant. */
    size: { type: String, default: "md" },
    /** Whether this sub-button represents the current active item. */
    isActive: { type: Boolean, default: false },
});

const theme = useTheme("NavigationSidebarMenuSubButton", props, reactive({ size: toRef(props, "size") }));
</script>

<template>
    <Primitive
        data-slot="sidebar-menu-sub-button"
        data-sidebar="menu-sub-button"
        :as="as"
        :as-child="asChild"
        :data-size="size"
        :data-active="isActive"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </Primitive>
</template>
