<script setup>
import { useSidebar } from "@vueda/use/useSidebar.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A thin interactive rail on the sidebar edge that can be clicked to toggle the sidebar.
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

const theme = useTheme("SidebarRail", props);
const { toggleSidebar } = useSidebar();
</script>

<template>
    <button
        data-sidebar="rail"
        data-slot="sidebar-rail"
        aria-label="Toggle Sidebar"
        :tabindex="-1"
        title="Toggle Sidebar"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        @click="toggleSidebar"
    >
        <slot />
    </button>
</template>
