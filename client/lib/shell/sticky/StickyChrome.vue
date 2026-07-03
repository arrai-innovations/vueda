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
    /** Which provider zone to teleport into. Fixed at mount; changing it later does not move the bar. */
    zone: {
        type: String,
        default: "top",
        validator: (value) => ["top", "bottom"].includes(value),
    },
    /** Sort order of this bar within its zone's stack (ascending, top to bottom). Reactive: changing it re-sorts the stack. */
    order: {
        type: Number,
        default: 0,
    },
    /**
     * This bar's reveal behavior: a strategy string (`always`, `scroll-up`, `scroll-up-or-idle`) or
     * a boolean (revealed when `true`). When omitted, the bar stays visible (`always`).
     * @type {import('vue').PropType<import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy | boolean>}
     */
    reveal: {
        type: [String, Boolean],
        default: undefined,
        validator: (value) =>
            typeof value === "boolean" || ["always", "scroll-up", "scroll-up-or-idle"].includes(value),
    },
});

// Pass `order` and `reveal` as getters so the bar tracks those reactive props without re-registering.
// `zone` is read once: moving a bar between zones would require tearing down and re-registering it.
const { target } = useStickyStack({ zone: props.zone, order: () => props.order, reveal: () => props.reveal });
</script>
<template>
    <!-- disabled (not v-if) so the slotted chrome keeps its state as the zone appears or disappears -->
    <Teleport :to="target" :disabled="!target">
        <slot />
    </Teleport>
</template>
