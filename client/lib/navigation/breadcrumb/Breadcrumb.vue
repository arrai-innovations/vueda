<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A navigation breadcrumb root element.
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

const theme = useTheme("Breadcrumb", props);
</script>

<template>
    <nav aria-label="breadcrumb" data-slot="breadcrumb" :class="[theme('root'), props.class]">
        <slot />
    </nav>
</template>
