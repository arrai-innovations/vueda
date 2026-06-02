<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The tfoot element for a grid table with muted background and top border styling.
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

const theme = useTheme("TableFooter", props);
</script>

<template>
    <tfoot data-slot="table-footer" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </tfoot>
</template>
