<script setup>
import { ContextMenuTrigger, useForwardProps } from "reka-ui";

/**
 * The area that triggers a context menu on right-click.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** When true, the context menu will not open on right-click. */
    disabled: { type: Boolean, default: undefined },
});

const forwardedProps = useForwardProps(props);
</script>

<template>
    <ContextMenuTrigger data-slot="context-menu-trigger" v-bind="forwardedProps">
        <slot />
    </ContextMenuTrigger>
</template>
