<script setup>
import { useForwardPropsEmits } from "reka-ui";
import { DrawerRoot } from "vaul-vue";

/**
 * Root Drawer component, a mobile-friendly dialog variant that slides in from an edge and supports drag-to-dismiss.
 */
defineOptions({});

const props = defineProps({
    /** Whether the drawer is open. */
    open: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Whether to use modal behavior. */
    modal: { type: Boolean, default: undefined },
    /** Whether to scale the background when the drawer opens. */
    shouldScaleBackground: { type: Boolean, default: true },
    /** Whether to change the background color when scaled. */
    setBackgroundColorOnScale: { type: Boolean, default: undefined },
    /** Direction the drawer slides in from. */
    direction: { type: String, default: undefined },
    /** Whether the drawer can be dismissed by dragging, clicking outside, or pressing escape. */
    dismissible: { type: Boolean, default: undefined },
    /** When true, only allows the drawer to be dragged by the handle component. */
    handleOnly: { type: Boolean, default: undefined },
    /** Whether this is a nested drawer. */
    nested: { type: Boolean, default: undefined },
    /** When true, prevents the drawer from moving upward when the keyboard opens. */
    fixed: { type: Boolean, default: undefined },
    /** When true, prevents vaul from applying styles to the body element. */
    noBodyStyles: { type: Boolean, default: undefined },
    /** Drag percentage threshold (0 to 1) required to close the drawer. */
    closeThreshold: { type: Number, default: undefined },
    /** Duration in ms after scrolling before drag is re-enabled. */
    scrollLockTimeout: { type: Number, default: undefined },
    /** Snap points as fractions (0 to 1) of screen height. */
    snapPoints: { type: Array, default: undefined },
    /** The currently active snap point. */
    activeSnapPoint: { type: [Number, String], default: undefined },
    /** Whether to prevent scroll restoration on close. */
    preventScrollRestoration: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:open", "update:activeSnapPoint", "drag", "release", "close", "animationEnd"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <DrawerRoot v-slot="slotProps" data-slot="drawer" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </DrawerRoot>
</template>
