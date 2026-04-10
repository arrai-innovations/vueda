<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A table header cell with fixed height, left-aligned text, and checkbox support.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("GridTableHead", props);
</script>

<template>
    <th data-slot="table-head" :class="[theme('root'), props.class]">
        <slot />
    </th>
</template>
