<script setup>
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/navigation/SidebarTrigger.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useSidebar } from "@vueda/use/useSidebar.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A button that toggles the sidebar open or closed. The toggle glyph resolves through
 * `useIcons("SidebarTrigger", props)("toggle")`; consumers register a default (canon is
 * `fa-regular fa-rectangle-list`) via `setIcons` or replace per-instance via `iconOverride`.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("SidebarTrigger", props);
const icon = useIcons("SidebarTrigger", props);
const { toggleSidebar } = useSidebar();
</script>

<template>
    <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        @click="toggleSidebar"
    >
        <component
            :is="icon('toggle').component"
            v-if="icon('toggle')"
            v-bind="icon('toggle').props"
            aria-hidden="true"
        />
        <span class="sr-only">Toggle Sidebar</span>
    </Button>
</template>
