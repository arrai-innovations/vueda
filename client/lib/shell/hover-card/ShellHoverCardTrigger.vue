<script setup>
import { HoverCardTrigger } from "reka-ui";

/**
 * The trigger element that opens a HoverCard on hover.
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
    <HoverCardTrigger data-slot="hover-card-trigger" v-bind="props">
        <slot />
    </HoverCardTrigger>
</template>
