<script setup>
import "@vueda/theme/vueda-tailwind/navigation/SidebarGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A group of related sidebar items with optional label and actions.
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

const theme = useTheme("SidebarGroup", props);
</script>

<template>
    <div
        data-slot="sidebar-group"
        data-sidebar="group"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </div>
</template>
