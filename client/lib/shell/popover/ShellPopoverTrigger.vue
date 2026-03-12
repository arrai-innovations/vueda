<script setup>
import { PopoverTrigger } from "reka-ui";

/**
 * The trigger button that opens a Popover.
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
