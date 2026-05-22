<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The thead element for a grid table, adding a bottom border to each header row.
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

const theme = useTheme("TableHeader", props);
</script>

<template>
    <thead data-slot="table-header" :class="[theme('root'), props.class]">
        <slot />
    </thead>
</template>
