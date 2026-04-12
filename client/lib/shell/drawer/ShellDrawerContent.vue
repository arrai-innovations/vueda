<script setup>
import ShellDrawerOverlay from "./ShellDrawerOverlay.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { useForwardPropsEmits } from "reka-ui";
import { DrawerContent, DrawerPortal } from "vaul-vue";

/**
 * The content panel of a Drawer, rendered in a portal and sliding in from a chosen direction.
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
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** Whether to trap focus inside the drawer. */
    trapFocus: { type: Boolean, default: undefined },
    /** Whether to disable outside pointer events. */
    disableOutsidePointerEvents: { type: Boolean, default: undefined },
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
    /** Emitted when focus moves inside the content after it opens. */
    openAutoFocus: null,
    /** Emitted when focus returns to the trigger after the content closes. */
    closeAutoFocus: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellDrawerContent", props);
</script>

<template>
    <DrawerPortal>
        <ShellDrawerOverlay />
        <DrawerContent
            data-slot="drawer-content"
            :class="[theme('root'), props.class]"
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <div :class="theme('handle')" />
            <slot />
        </DrawerContent>
    </DrawerPortal>
</template>
