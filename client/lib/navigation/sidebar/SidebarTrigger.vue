<script setup>
import Button from "@vueda/controls/button/Button.vue";
import { useSidebar } from "@vueda/use/useSidebar.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A button that toggles the sidebar open or closed.
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

const theme = useTheme("SidebarTrigger", props);
const { toggleSidebar } = useSidebar();
</script>

<template>
    <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        :class="[theme('root'), props.class]"
        @click="toggleSidebar"
    >
        <!-- Replaces the sidebar toggle icon; receives no slot props. -->
        <slot name="icon">
            <span aria-hidden="true" class="select-none">◫</span>
        </slot>
        <span class="sr-only">Toggle Sidebar</span>
    </Button>
</template>
