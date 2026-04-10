<script setup>
import { ContextMenuGroup } from "reka-ui";

/**
 * Groups related context menu items together.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <ContextMenuGroup data-slot="context-menu-group" v-bind="props">
        <slot />
    </ContextMenuGroup>
</template>
