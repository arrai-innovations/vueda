<script setup>
import "@vueda/theme/vueda-tailwind/navigation/BreadcrumbList.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * An ordered list of breadcrumb items.
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

const theme = useTheme("BreadcrumbList", props);
</script>

<template>
    <ol data-slot="breadcrumb-list" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </ol>
</template>
