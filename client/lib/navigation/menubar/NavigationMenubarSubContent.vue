<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { MenubarPortal, MenubarSubContent, useForwardPropsEmits } from "reka-ui";

/**
 * The content panel of a menubar submenu, rendered inside a portal.
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
    /** The distance in pixels from the trigger. */
    sideOffset: { type: Number, default: undefined },
    /** An offset in pixels from the start or end alignment options. */
    alignOffset: { type: Number, default: undefined },
    /** When true, overrides side and align preferences to prevent collisions. */
    avoidCollisions: { type: Boolean, default: undefined },
    /** Collision padding in pixels. */
    collisionPadding: { type: [Number, Object], default: undefined },
    /** Whether to hide the content when the trigger becomes fully occluded. */
    hideWhenDetached: { type: Boolean, default: undefined },
    /** Whether to prioritize position to prevent collisions. */
    prioritizePosition: { type: Boolean, default: undefined },
});

const emits = defineEmits([
    "entryFocus",
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationMenubarSubContent", props);
</script>

<template>
    <MenubarPortal>
        <MenubarSubContent
            data-slot="menubar-sub-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />
        </MenubarSubContent>
    </MenubarPortal>
</template>
