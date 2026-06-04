<script setup>
import "@vueda/theme/vueda-tailwind/navigation/BreadcrumbItem.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A single item within a breadcrumb list.
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

const theme = useTheme("BreadcrumbItem", props);
</script>

<template>
    <li data-slot="breadcrumb-item" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </li>
</template>
