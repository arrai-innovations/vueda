<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { HoverCardContent, HoverCardPortal, useForwardProps } from "reka-ui";

/**
 * The content panel of a HoverCard, rendered in a portal.
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
    /** The side the hover card appears on relative to the trigger. */
    side: { type: String, default: undefined },
    /** The alignment along the side axis. */
    align: { type: String, default: undefined },
    /** The distance in pixels from the trigger. */
    sideOffset: { type: Number, default: 4 },
    /** The offset along the alignment axis. */
    alignOffset: { type: Number, default: undefined },
    /** Whether to avoid collisions with boundary edges. */
    avoidCollisions: { type: Boolean, default: undefined },
    /** The collision boundary element(s). */
    collisionBoundary: { type: [Object, Array], default: undefined },
    /** The padding for collision detection. */
    collisionPadding: { type: [Number, Object], default: undefined },
    /** The sticky behavior on the align axis. */
    sticky: { type: String, default: undefined },
    /** Whether to hide the content when the trigger is fully occluded. */
    hideWhenDetached: { type: Boolean, default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("HoverCardContent", props);
</script>

<template>
    <HoverCardPortal>
        <HoverCardContent
            data-slot="hover-card-content"
            v-bind="{ ...$attrs, ...forwardedProps }"
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
        >
            <slot />
        </HoverCardContent>
    </HoverCardPortal>
</template>
