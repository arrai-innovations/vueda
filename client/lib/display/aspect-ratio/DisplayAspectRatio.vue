<script setup>
import { AspectRatio } from "reka-ui";

/**
 * Constrains content to a given aspect ratio using Reka UI's AspectRatio primitive.
 */
defineOptions({});

const props = defineProps({
    /** The desired aspect ratio (e.g. 16/9). */
    ratio: { type: Number, default: 1 },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <AspectRatio v-slot="slotProps" data-slot="aspect-ratio" v-bind="props">
        <slot v-bind="slotProps" />
    </AspectRatio>
</template>
