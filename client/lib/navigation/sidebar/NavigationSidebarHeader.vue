<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The header section of the sidebar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarHeader", props);
</script>

<template>
    <div data-slot="sidebar-header" data-sidebar="header" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
