<script setup>
import DialogOverlay from "./DialogOverlay.vue";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogClose, DialogContent, DialogPortal } from "reka-ui";

/**
 * The content panel of a Dialog, rendered in a portal with an overlay and optional close button.
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
    /** Whether to show the close button. */
    showCloseButton: { type: Boolean, default: true },
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
    /** Emitted when a pointer-down event occurs outside the content. */
    pointerDownOutside: null,
    /** Emitted when focus moves outside the content. */
    focusOutside: null,
    /** Emitted when any interaction occurs outside the content. */
    interactOutside: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("DialogContent", props);
const icon = useIcons("DialogContent");
</script>

<template>
    <DialogPortal>
        <DialogOverlay />
        <DialogContent
            data-slot="dialog-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
        >
            <slot />

            <DialogClose v-if="showCloseButton" data-slot="dialog-close" :class="theme('close')">
                <!-- Replaces the close-button icon; receives no slot props. -->
                <slot name="close-icon">
                    <component
                        :is="icon('close').component"
                        v-if="icon('close')"
                        v-bind="icon('close').props"
                        aria-hidden="true"
                    />
                </slot>
                <span class="sr-only">Close</span>
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>
