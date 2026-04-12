<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The header area of a Dialog, used to arrange the title and description.
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

const theme = useTheme("ShellDialogHeader", props);
</script>

<template>
    <div data-slot="dialog-header" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
