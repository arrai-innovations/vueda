<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A group of related sidebar items with optional label and actions.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarGroup", props);
</script>

<template>
    <div data-slot="sidebar-group" data-sidebar="group" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
