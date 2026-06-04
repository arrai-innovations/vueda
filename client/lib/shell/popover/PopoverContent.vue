<script setup>
import "@vueda/theme/vueda-tailwind/shell/PopoverContent.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PopoverContent, PopoverPortal } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * The floating content panel of a popover, rendered inside a portal.
 * Positioned relative to the trigger or anchor element.
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
    /** The preferred side of the trigger to render against. */
    side: { type: String, default: undefined },
    /** The distance in pixels from the trigger. */
    sideOffset: { type: Number, default: 4 },
    /** The preferred alignment against the trigger. */
    align: { type: String, default: "center" },
    /** An offset in pixels from the alignment edge. */
    alignOffset: { type: Number, default: undefined },
    /** When true, overrides side and align to avoid collisions with boundary edges. */
    avoidCollisions: { type: Boolean, default: undefined },
    /** The padding between the content and the boundary edge. */
    collisionPadding: { type: [Number, Object], default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** When true, keeps the content in place relative to the trigger even when it overflows. */
    sticky: { type: String, default: undefined },
    /** When true, hides the content when the trigger is fully occluded. */
    hideWhenDetached: { type: Boolean, default: undefined },
    /** Forces content to render as a specific element. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** When true, prevents auto-focusing the first focusable element. */
    trapFocus: { type: Boolean, default: undefined },
    /**
     * Surface size variant. `sm` (w-60 / p-3) for compact utility popovers,
     * `default` (w-72 / p-4) for general use, `lg` (w-90 / p-5) for richer
     * confirmation or form popovers.
     */
    size: { type: String, default: "default" },
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

const delegatedProps = reactiveOmit(props, "class", "size", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("PopoverContent", props, reactive({ size: toRef(props, "size") }));
</script>

<template>
    <PopoverPortal>
        <PopoverContent
            data-slot="popover-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
        >
            <slot />
        </PopoverContent>
    </PopoverPortal>
</template>
