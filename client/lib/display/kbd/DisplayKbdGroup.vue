<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A container for grouping multiple Kbd key elements inline.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("DisplayKbdGroup", props);
</script>

<template>
    <kbd data-slot="kbd-group" :class="[theme('root'), props.class]">
        <slot />
    </kbd>
</template>
