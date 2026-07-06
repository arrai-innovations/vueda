<script setup>
import Kbd from "@vueda/display/kbd/Kbd.vue";
import "@vueda/theme/vueda-tailwind/navigation/ContextMenuShortcut.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Displays a keyboard shortcut hint within a context menu item.
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

const theme = useTheme("ContextMenuShortcut", props);
</script>

<template>
    <span data-slot="context-menu-shortcut" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <Kbd :class="theme('kbd')">
            <slot />
        </Kbd>
    </span>
</template>
