<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A nested sub-menu list inside a sidebar menu item.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarMenuSub", props);
</script>

<template>
    <ul data-slot="sidebar-menu-sub" data-sidebar="menu-badge" :class="[theme('root'), props.class]">
        <slot />
    </ul>
</template>
