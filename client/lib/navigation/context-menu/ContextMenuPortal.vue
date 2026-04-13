<script setup>
import { ContextMenuPortal } from "reka-ui";

/**
 * Portals a context menu into a different part of the DOM.
 */
defineOptions({});

const props = defineProps({
    /** The target element or selector to teleport to. */
    to: { type: [String, Object], default: undefined },
    /** When true, disables the teleport and renders inline. */
    disabled: { type: Boolean, default: undefined },
});
</script>

<template>
    <ContextMenuPortal data-slot="context-menu-portal" v-bind="props">
        <slot />
    </ContextMenuPortal>
</template>
