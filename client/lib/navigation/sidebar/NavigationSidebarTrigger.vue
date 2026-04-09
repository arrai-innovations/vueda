<script setup>
import { useSidebar } from "./utils.js";
import { ControlButton } from "@vueda/controls/button";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { PanelLeft } from "lucide-vue-next";

/**
 * A button that toggles the sidebar open or closed.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarTrigger", props);
const { toggleSidebar } = useSidebar();
</script>

<template>
    <ControlButton
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        :class="[theme('root'), props.class]"
        @click="toggleSidebar"
    >
        <PanelLeft />
        <span class="sr-only">Toggle Sidebar</span>
    </ControlButton>
</template>
