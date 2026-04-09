<script setup>
import ShellSheetOverlay from "./ShellSheetOverlay.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * The content panel of a Sheet, rendered in a portal and sliding in from a chosen side.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
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
const emits = defineEmits([
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class", "side", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellSheetContent", props, reactive({ side: toRef(props, "side") }));
</script>

<template>
    <DialogPortal>
        <ShellSheetOverlay />
        <DialogContent
            data-slot="sheet-content"
            :class="[theme('root'), props.class]"
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <slot />

            <DialogClose :class="theme('close')">
                <X class="size-4" />
                <span class="sr-only">Close</span>
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>
