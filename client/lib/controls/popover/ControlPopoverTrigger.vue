<script setup>
import { PopoverTrigger } from "reka-ui";

/**
 * A button that toggles the popover open state when clicked.
 * Renders inside a ControlPopover.
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
    <PopoverTrigger data-slot="popover-trigger" v-bind="props">
        <slot />
    </PopoverTrigger>
</template>
