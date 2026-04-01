<script setup>
import { ComboboxVirtualizer, useForwardProps } from "reka-ui";

/**
 * Virtualizes the list of items inside ControlComboboxViewport for large datasets.
 * Requires manual filtering of options before passing them in.
 */
defineOptions({});

const props = defineProps({
    /** List of items to render. */
    options: { type: Array, required: true },
    /** Estimated size (in px) of each item. */
    estimateSize: { type: [Number, Function], default: undefined },
    /** Number of items rendered outside the visible area. */
    overscan: { type: Number, default: undefined },
    /** Text content for each item to achieve type-ahead feature. */
    textContent: { type: Function, default: undefined },
});

const forwarded = useForwardProps(props);
</script>

<template>
    <ComboboxVirtualizer v-slot="slotProps" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </ComboboxVirtualizer>
</template>
