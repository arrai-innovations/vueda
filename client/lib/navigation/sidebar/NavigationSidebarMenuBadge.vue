<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A badge displayed at the right of a sidebar menu button.
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

const theme = useTheme("NavigationSidebarMenuBadge", props);
</script>

<template>
    <div data-slot="sidebar-menu-badge" data-sidebar="menu-badge" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
