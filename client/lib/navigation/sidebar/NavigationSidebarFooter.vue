<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The footer section of the sidebar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarFooter", props);
</script>

<template>
    <div data-slot="sidebar-footer" data-sidebar="footer" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
