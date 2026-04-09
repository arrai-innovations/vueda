<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The content container within a sidebar group.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarGroupContent", props);
</script>

<template>
    <div data-slot="sidebar-group-content" data-sidebar="group-content" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
