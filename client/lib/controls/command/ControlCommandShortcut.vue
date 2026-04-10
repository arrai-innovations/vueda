<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Displays a keyboard shortcut hint aligned to the right of a ControlCommandItem.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlCommandShortcut", props);
</script>

<template>
    <span data-slot="command-shortcut" :class="[theme('root'), props.class]">
        <slot />
    </span>
</template>
