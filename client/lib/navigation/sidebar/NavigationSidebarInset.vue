<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The main content area adjacent to an inset-variant sidebar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarInset", props);
</script>

<template>
    <main data-slot="sidebar-inset" :class="[theme('root'), props.class]">
        <slot />
    </main>
</template>
