<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A table row with hover, selected-state, and border-bottom transition styles.
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

const theme = useTheme("GridTableRow", props);
</script>

<template>
    <tr data-slot="table-row" :class="[theme('root'), props.class]">
        <slot />
    </tr>
</template>
