<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A visual separator between breadcrumb items.
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

const theme = useTheme("NavigationBreadcrumbSeparator", props);
</script>

<template>
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" :class="[theme('root'), props.class]">
        <slot>/</slot>
    </li>
</template>
