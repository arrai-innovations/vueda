<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A placeholder skeleton element that animates while content is loading.
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

const theme = useTheme("Skeleton", props);
</script>

<template>
    <div data-slot="skeleton" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value" />
</template>
