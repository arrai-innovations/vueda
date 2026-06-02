<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Mono supporting-text label for pagination summaries
 * (e.g. "441 invoices · page 7 of 23"). Sits inside `PaginationBar`.
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

const theme = useTheme("PaginationMeta", props);
</script>

<template>
    <span data-slot="pagination-meta" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </span>
</template>
