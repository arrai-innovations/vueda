<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The header area of an AlertDialog, used to arrange the title and description.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellAlertDialogHeader", props);
</script>

<template>
    <div data-slot="alert-dialog-header" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
