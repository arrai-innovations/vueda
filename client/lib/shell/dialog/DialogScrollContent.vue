<script setup>
import "@vueda/theme/vueda-tailwind/shell/DialogScrollContent.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogClose, DialogContent, DialogOverlay, DialogPortal } from "reka-ui";

/**
 * A scrollable Dialog content panel that renders in a portal with a scrollable overlay.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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
    /** Emitted when a pointer-down event occurs outside the content. */
    pointerDownOutside: null,
    /** Emitted when focus moves outside the content. */
    focusOutside: null,
    /** Emitted when any interaction occurs outside the content. */
    interactOutside: null,
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("DialogScrollContent", props);
const icon = useIcons("DialogScrollContent", props);
</script>

<template>
    <DialogPortal>
        <DialogOverlay :class="theme('overlay')">
            <DialogContent
                :class="[theme('root'), props.class]"
                :style="theme.hideStyle?.value"
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
        </DialogOverlay>
    </DialogPortal>
</template>
