<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * An ordered list of breadcrumb items.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationBreadcrumbList", props);
</script>

<template>
    <ol data-slot="breadcrumb-list" :class="[theme('root'), props.class]">
        <slot />
    </ol>
</template>
