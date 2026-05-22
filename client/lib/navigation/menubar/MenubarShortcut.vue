<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Displays a keyboard shortcut hint within a menubar item.
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

const theme = useTheme("MenubarShortcut", props);
</script>

<template>
    <span data-slot="menubar-shortcut" :class="[theme('root'), props.class]">
        <slot />
    </span>
</template>
