<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, useForwardPropsEmits } from "reka-ui";

/**
 * A scrollable Dialog content panel that renders in a portal with a scrollable overlay.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
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
const theme = useTheme("ShellDialogScrollContent", props);
</script>

<template>
    <DialogPortal>
        <DialogOverlay :class="theme('overlay')">
            <DialogContent
                :class="[theme('root'), props.class]"
                v-bind="{ ...$attrs, ...forwarded }"
                @pointer-down-outside="
                    (event) => {
                        const originalEvent = event.detail.originalEvent;
                        const target = originalEvent.target;
                        if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) {
                            event.preventDefault();
                        }
                    }
                "
            >
                <slot />

                <DialogClose :class="theme('close')">
                    <X class="w-4 h-4" />
                    <span class="sr-only">Close</span>
                </DialogClose>
            </DialogContent>
        </DialogOverlay>
    </DialogPortal>
</template>
