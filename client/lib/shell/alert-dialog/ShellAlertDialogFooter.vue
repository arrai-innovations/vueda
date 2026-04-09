<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The footer area of an AlertDialog, used to arrange action and cancel buttons.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellAlertDialogFooter", props);
</script>

<template>
    <div data-slot="alert-dialog-footer" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
