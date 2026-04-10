<script setup>
import { CollapsibleContent } from "reka-ui";

/**
 * The content area that is shown or hidden by a Collapsible.
 */
defineOptions({});

const props = defineProps({
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <CollapsibleContent data-slot="collapsible-content" v-bind="props">
        <slot />
    </CollapsibleContent>
</template>
