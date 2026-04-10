<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A caption element for a grid table, styled below the table content.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("GridTableCaption", props);
</script>

<template>
    <caption data-slot="table-caption" :class="[theme('root'), props.class]">
        <slot />
    </caption>
</template>
