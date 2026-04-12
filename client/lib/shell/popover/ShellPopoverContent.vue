<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from "reka-ui";

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
const theme = useTheme("ShellPopoverContent", props);
</script>

<template>
    <PopoverPortal>
        <PopoverContent
            data-slot="popover-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />
        </PopoverContent>
    </PopoverPortal>
</template>
