<script setup>
import { cn } from "@vueda/utils/cn.js";
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
    /** @type {import('vue').HTMLAttributes['class']} */
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
    /** When true, prevents the content from overflowing its boundary. */
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
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <PopoverPortal>
        <PopoverContent
            data-slot="popover-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="
                cn(
                    'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md origin-(--reka-popover-content-transform-origin) outline-hidden',
                    props.class,
                )
            "
        >
            <slot />
        </PopoverContent>
    </PopoverPortal>
</template>
