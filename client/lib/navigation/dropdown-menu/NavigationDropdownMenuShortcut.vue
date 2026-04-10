<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Displays a keyboard shortcut hint within a dropdown menu item.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationDropdownMenuShortcut", props);
</script>

<template>
    <span data-slot="dropdown-menu-shortcut" :class="[theme('root'), props.class]">
        <slot />
    </span>
</template>
