<script setup>
import { PopoverAnchor } from "reka-ui";

/**
 * An anchor element for positioning a Popover relative to a reference element.
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
    <PopoverAnchor data-slot="popover-anchor" v-bind="props">
        <slot />
    </PopoverAnchor>
</template>
