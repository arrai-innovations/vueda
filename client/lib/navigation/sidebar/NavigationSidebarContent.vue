<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The scrollable content area of the sidebar.
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

const theme = useTheme("NavigationSidebarContent", props);
</script>

<template>
    <div data-slot="sidebar-content" data-sidebar="content" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
