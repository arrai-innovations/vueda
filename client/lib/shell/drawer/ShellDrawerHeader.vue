<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Header section of a Drawer, typically containing the title and description.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellDrawerHeader", props);
</script>

<template>
    <div data-slot="drawer-header" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
