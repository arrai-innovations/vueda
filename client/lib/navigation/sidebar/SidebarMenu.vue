<script setup>
import "@vueda/theme/vueda-tailwind/navigation/SidebarMenu.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A list of sidebar menu items.
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

const theme = useTheme("SidebarMenu", props);
</script>

<template>
    <ul
        data-slot="sidebar-menu"
        data-sidebar="menu"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </ul>
</template>
