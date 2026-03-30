<script setup>
import { PopoverAnchor } from "reka-ui";

/**
 * An optional anchor element that positions the popover content relative
 * to a different element than the trigger.
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
