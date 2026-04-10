<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A table wrapper component providing a scrollable container and styled table element.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("GridTable", props);
</script>

<template>
    <div data-slot="table-container" :class="theme('container')">
        <table data-slot="table" :class="[theme('table'), props.class]">
            <slot />
        </table>
    </div>
</template>
