<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Represents the current page within a breadcrumb trail.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationBreadcrumbPage", props);
</script>

<template>
    <span
        data-slot="breadcrumb-page"
        role="link"
        aria-disabled="true"
        aria-current="page"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </span>
</template>
