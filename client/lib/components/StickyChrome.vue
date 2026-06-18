<script setup>
import { useStickyStack } from "@vueda/use/useStickyStack.js";

/**
 * Teleports a view's sticky chrome into one of the `StickyStackProvider` zones (`top` or `bottom`)
 * and registers the reveal behavior that zone should adopt while this chrome is mounted (see
 * `useStickyStack`). When no provider zone exists above, the chrome renders inline where this
 * component is placed, so a view degrades gracefully if the layout omits the provider.
 */
defineOptions({
    inheritAttrs: false, // the root is a Teleport, which has no host element to receive attributes
});

const props = defineProps({
    /** Which provider zone to teleport into. */
    zone: {
        type: String,
        default: "top",
        validator: (value) => ["top", "bottom"].includes(value),
    },
    /** Sort order of this bar within its zone's stack (ascending, top to bottom). */
    order: {
        type: Number,
        default: 0,
    },
    /**
     * This bar's reveal behavior: a strategy string (`always`, `scroll-up`, `scroll-up-or-idle`) or
     * a boolean (revealed when `true`). When omitted, the bar stays visible (`always`).
     * @type {import('vue').PropType<string|boolean>}
     */
    reveal: {
        type: [String, Boolean],
        default: undefined,
    },
});

// Pass reveal as a getter so a bar tracks a reactive `reveal` prop without re-registering.
const { target } = useStickyStack({ zone: props.zone, order: props.order, reveal: () => props.reveal });
</script>
<template>
    <!-- disabled (not v-if) so the slotted chrome keeps its state as the zone appears or disappears -->
    <Teleport :to="target" :disabled="!target">
        <slot />
    </Teleport>
</template>
