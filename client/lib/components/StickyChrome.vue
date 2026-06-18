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
    /**
     * Reveal behavior this chrome wants for its zone: a strategy string (`always`, `scroll-up`,
     * `scroll-up-or-idle`) or a boolean (revealed when `true`). When omitted, the zone keeps its
     * default. The active view's registration drives the zone while it is mounted.
     * @type {import('vue').PropType<string|boolean>}
     */
    reveal: {
        type: [String, Boolean],
        default: undefined,
    },
});

// Pass reveal as a getter so a zone tracks a reactive `reveal` prop without re-registering.
const { target } = useStickyStack({ zone: props.zone, reveal: () => props.reveal });
</script>
<template>
    <!-- disabled (not v-if) so the slotted chrome keeps its state as the zone appears or disappears -->
    <Teleport :to="target" :disabled="!target">
        <slot />
    </Teleport>
</template>
