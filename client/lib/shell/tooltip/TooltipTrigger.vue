<script setup>
import { TooltipTrigger } from "reka-ui";

/**
 * The trigger element that shows a Tooltip on hover or focus.
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
    <TooltipTrigger data-slot="tooltip-trigger" v-bind="props">
        <slot />
    </TooltipTrigger>
</template>
