<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The title heading inside a CardHeader.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellCardTitle", props);
</script>

<template>
    <h3 data-slot="card-title" :class="[theme('root'), props.class]">
        <slot />
    </h3>
</template>
