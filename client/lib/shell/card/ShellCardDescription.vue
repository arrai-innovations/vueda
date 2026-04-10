<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A muted description paragraph inside a CardHeader.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellCardDescription", props);
</script>

<template>
    <p data-slot="card-description" :class="[theme('root'), props.class]">
        <slot />
    </p>
</template>
