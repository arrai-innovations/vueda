<script setup>
import "@vueda/theme/vueda-tailwind/shell/StickyBar.theme.js";
import { useScrollReveal } from "@vueda/use/useScrollReveal.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive, useSlots, useTemplateRef } from "vue";

/**
 * Renders a sticky toolbar that hides when the user scrolls down past its
 * initial position and reappears when they scroll back up or the scroll pauses.
 * By default it reacts to the window's scroll; pass `scrollRoot` when the bar
 * lives inside a scrollable region so it pins to and reacts to that region
 * instead. The scroll-driven hide/reveal behavior comes from `useScrollReveal`
 * (the `scroll-up-or-idle` strategy). Exposes named `primary` (submit / primary
 * actions, pushed to the start) and `secondary` (read-only actions, contextual
 * info) slots; falls back to the default slot when neither named slot is bound.
 */
defineOptions({});

const root = useTemplateRef("root");
const slots = useSlots();
const props = defineProps({
    /**
     * Scroll container the bar reacts to. Pass the scrollable element (or a ref
     * to one) when the bar lives inside a scrollable region rather than the
     * page; the hide/reveal threshold and the scroll listener bind to it. When
     * `null` (the default) the bar reacts to the window.
     */
    scrollRoot: {
        type: Object,
        default: null,
    },
    ...THEME_OVERRIDE_PROPS,
});

const hasPrimarySlot = computed(() => Boolean(slots.primary));
const hasSecondarySlot = computed(() => Boolean(slots.secondary));
const useNamedSlots = computed(() => hasPrimarySlot.value || hasSecondarySlot.value);

// Submit/action bars should return the moment scrolling settles, so the bar uses
// the idle-reveal strategy (the original, and still default, StickyBar behavior).
const { hidden } = useScrollReveal(root, { scrollRoot: () => props.scrollRoot });

const theme = useTheme("StickyBar", props, reactive({ hidden }));
</script>
<template>
    <div ref="root" :class="theme('root')" :style="theme.hideStyle?.value" data-qa="sticky-bar-root">
        <div :class="theme('inner')" data-qa="sticky-bar-inner">
            <template v-if="useNamedSlots">
                <div v-if="hasPrimarySlot" :class="theme('primary')" data-qa="sticky-bar-primary">
                    <!-- @slot [primary] Primary action area (e.g. submit button), pushed to the start of the bar. -->
                    <slot name="primary" />
                </div>
                <div v-if="hasSecondarySlot" :class="theme('secondary')" data-qa="sticky-bar-secondary">
                    <!-- @slot [secondary] Secondary action / contextual info area, pinned to the end of the bar. -->
                    <slot name="secondary" />
                </div>
            </template>
            <slot v-else />
        </div>
    </div>
</template>

<style scoped></style>
