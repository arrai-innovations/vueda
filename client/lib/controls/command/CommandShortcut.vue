<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Displays a keyboard shortcut hint aligned to the right of a CommandItem.
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

const theme = useTheme("CommandShortcut", props);
</script>

<template>
    <span data-slot="command-shortcut" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </span>
</template>
