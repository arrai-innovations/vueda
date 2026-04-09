<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Footer section of a Drawer, typically containing action buttons.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellDrawerFooter", props);
</script>

<template>
    <div data-slot="drawer-footer" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
