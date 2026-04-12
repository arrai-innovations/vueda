<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogOverlay } from "reka-ui";

/**
 * The overlay backdrop behind a Dialog.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to force mount the overlay. */
    forceMount: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellDialogOverlay", props);
</script>

<template>
    <DialogOverlay data-slot="dialog-overlay" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </DialogOverlay>
</template>
