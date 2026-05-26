<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuContent, DropdownMenuPortal } from "reka-ui";

/**
 * The content panel of a dropdown menu, rendered inside a portal.
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
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** Used to force mounting when more control is needed. */
    forceMount: { type: Boolean, default: undefined },
    /** When true, keyboard navigation will loop from last item to first, and vice versa. */
    loop: { type: Boolean, default: undefined },
    /** The preferred side of the trigger to render against. */
    side: { type: String, default: undefined },
    /** The distance in pixels from the trigger. */
    sideOffset: { type: Number, default: 4 },
    /** The preferred alignment against the trigger. */
    align: { type: String, default: undefined },
    /** An offset in pixels from the start or end alignment options. */
    alignOffset: { type: Number, default: undefined },
    /** When true, overrides side and align preferences to prevent collisions. */
    avoidCollisions: { type: Boolean, default: undefined },
    /** Collision padding in pixels. */
    collisionPadding: { type: [Number, Object], default: undefined },
    /** An element to use as the collision boundary. */
    collisionBoundary: { type: [Object, Array], default: undefined },
    /** The sticky behavior on the align axis. */
    sticky: { type: String, default: undefined },
    /** Whether to hide the content when the trigger becomes fully occluded. */
    hideWhenDetached: { type: Boolean, default: undefined },
    /** Update position strategy. */
    updatePositionStrategy: { type: String, default: undefined },
    /** The positioning strategy. */
    prioritizePosition: { type: Boolean, default: undefined },
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
    /** Emitted when focus returns to the trigger after the content closes. */
    closeAutoFocus: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("DropdownMenuContent", props);
</script>

<template>
    <DropdownMenuPortal>
        <DropdownMenuContent
            data-slot="dropdown-menu-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />
        </DropdownMenuContent>
    </DropdownMenuPortal>
</template>
