<script setup>
import "@vueda/theme/vueda-tailwind/navigation/SidebarInset.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The main content area adjacent to an inset-variant sidebar.
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

const theme = useTheme("SidebarInset", props);
</script>

<template>
    <main data-slot="sidebar-inset" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </main>
</template>
