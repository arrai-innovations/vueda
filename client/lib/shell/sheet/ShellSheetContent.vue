<script setup>
import ShellSheetOverlay from "./ShellSheetOverlay.vue";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The content panel of a Sheet, rendered in a portal and sliding in from a chosen side.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
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

const delegatedProps = reactiveOmit(props, "class", "side");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <DialogPortal>
        <ShellSheetOverlay />
        <DialogContent
            data-slot="sheet-content"
            :class="
                cn(
                    'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
                    side === 'right' &&
                        'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
                    side === 'left' &&
                        'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
                    side === 'top' &&
                        'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
                    side === 'bottom' &&
                        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
                    props.class,
                )
            "
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <slot />

            <DialogClose
                class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
                <X class="size-4" />
                <span class="sr-only">Close</span>
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>
