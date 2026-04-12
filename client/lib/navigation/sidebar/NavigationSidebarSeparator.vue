<script setup>
import ShellSeparator from "@vueda/shell/separator/ShellSeparator.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A visual separator between sections of the sidebar.
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

const theme = useTheme("NavigationSidebarSeparator", props);
</script>

<template>
    <ShellSeparator data-slot="sidebar-separator" data-sidebar="separator" :class="[theme('root'), props.class]" />
</template>
