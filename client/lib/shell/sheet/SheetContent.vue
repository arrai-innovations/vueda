<script setup>
import SheetOverlay from "./SheetOverlay.vue";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogClose, DialogContent, DialogPortal } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * The content panel of a Sheet, rendered in a portal and sliding in from a chosen side.
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
    /** The side the sheet slides in from. */
    side: { type: String, default: "right" },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** Whether to trap focus inside the dialog. */
    trapFocus: { type: Boolean, default: undefined },
    /** Whether to disable outside pointer events. */
    disableOutsidePointerEvents: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the Escape key is pressed. */
    escapeKeyDown: null,
    /** Emitted when a pointer-down event occurs outside the content. */
    pointerDownOutside: null,
    /** Emitted when focus moves outside the content. */
    focusOutside: null,
    /** Emitted when any interaction occurs outside the content. */
    interactOutside: null,
    /** Emitted when focus moves inside the content after it opens. */
    openAutoFocus: null,
    /** Emitted when focus returns to the trigger after the content closes. */
    closeAutoFocus: null,
});

const delegatedProps = reactiveOmit(props, "class", "side", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("SheetContent", props, reactive({ side: toRef(props, "side") }));
const icon = useIcons("SheetContent");
</script>

<template>
    <DialogPortal>
        <SheetOverlay />
        <DialogContent
            data-slot="sheet-content"
            :class="[theme('root'), props.class]"
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <slot />

            <DialogClose :class="theme('close')">
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
