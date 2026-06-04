<script setup>
import "@vueda/theme/vueda-tailwind/navigation/DropdownMenuShortcut.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Displays a keyboard shortcut hint within a dropdown menu item.
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

const theme = useTheme("DropdownMenuShortcut", props);
</script>

<template>
    <span data-slot="dropdown-menu-shortcut" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </span>
</template>
