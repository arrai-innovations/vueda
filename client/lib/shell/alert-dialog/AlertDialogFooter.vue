<script setup>
import "@vueda/theme/vueda-tailwind/shell/AlertDialogFooter.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The footer area of an AlertDialog, used to arrange action and cancel buttons.
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

const theme = useTheme("AlertDialogFooter", props);
</script>

<template>
    <div data-slot="alert-dialog-footer" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
