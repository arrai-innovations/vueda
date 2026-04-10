<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A table data cell with consistent padding, alignment, and checkbox support.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("GridTableCell", props);
</script>

<template>
    <td data-slot="table-cell" :class="[theme('root'), props.class]">
        <slot />
    </td>
</template>
