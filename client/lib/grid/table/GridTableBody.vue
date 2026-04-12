<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The tbody element for a grid table, removing the bottom border on the last row.
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

const theme = useTheme("GridTableBody", props);
</script>

<template>
    <tbody data-slot="table-body" :class="[theme('root'), props.class]">
        <slot />
    </tbody>
</template>
