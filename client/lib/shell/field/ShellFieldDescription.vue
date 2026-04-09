<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A paragraph that provides supplementary context for a field,
 * styled with muted text and link decorations.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellFieldDescription", props);
</script>

<template>
    <p data-slot="field-description" :class="[theme('root'), props.class]">
        <slot />
    </p>
</template>
