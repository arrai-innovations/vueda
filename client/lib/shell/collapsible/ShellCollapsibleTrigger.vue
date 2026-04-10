<script setup>
import { CollapsibleTrigger } from "reka-ui";

/**
 * The trigger button that toggles a Collapsible open or closed.
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
    <CollapsibleTrigger data-slot="collapsible-trigger" v-bind="props">
        <slot />
    </CollapsibleTrigger>
</template>
