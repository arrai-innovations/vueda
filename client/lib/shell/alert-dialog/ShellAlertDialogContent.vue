<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The content panel of an AlertDialog, rendered in a portal with an overlay.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to trap focus inside the content. */
    trapFocus: { type: Boolean, default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when focus moves inside the content after it opens. */
    openAutoFocus: null,
    /** Emitted when focus returns to the trigger after the content closes. */
    closeAutoFocus: null,
    /** Emitted when the Escape key is pressed. */
    escapeKeyDown: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellAlertDialogContent", props);
</script>

<template>
    <AlertDialogPortal>
        <AlertDialogOverlay data-slot="alert-dialog-overlay" :class="theme('overlay')" />
        <AlertDialogContent
            data-slot="alert-dialog-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />
        </AlertDialogContent>
    </AlertDialogPortal>
</template>
