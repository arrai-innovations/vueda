<script setup>
import ShellDialogOverlay from "./ShellDialogOverlay.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The content panel of a Dialog, rendered in a portal with an overlay and optional close button.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to show the close button. */
    showCloseButton: { type: Boolean, default: true },
    /** Whether to trap focus inside the content. */
    trapFocus: { type: Boolean, default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
});
const emits = defineEmits([
    "openAutoFocus",
    "closeAutoFocus",
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellDialogContent", props);
</script>

<template>
    <DialogPortal>
        <ShellDialogOverlay />
        <DialogContent
            data-slot="dialog-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />

            <DialogClose v-if="showCloseButton" data-slot="dialog-close" :class="theme('close')">
                <X />
                <span class="sr-only">Close</span>
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>
