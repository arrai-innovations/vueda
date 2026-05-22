<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Compound bar for data-grid footers. Provides the flex row chrome
 * (border-top, card surface, bottom card-radius caps) and exposes a
 * default slot so consumers compose `PaginationMeta`, `Pagination`, and
 * any per-page selector inside it.
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

const theme = useTheme("NavigationPaginationBar", props);
</script>

<template>
    <div data-slot="pagination-bar" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
