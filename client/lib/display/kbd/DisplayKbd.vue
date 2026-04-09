<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A keyboard key element with consistent styling.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("DisplayKbd", props);
</script>

<template>
    <kbd :class="[theme('root'), props.class]">
        <slot />
    </kbd>
</template>
