<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A single item within a sidebar menu list.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarMenuItem", props);
</script>

<template>
    <li data-slot="sidebar-menu-item" data-sidebar="menu-item" :class="[theme('root'), props.class]">
        <slot />
    </li>
</template>
