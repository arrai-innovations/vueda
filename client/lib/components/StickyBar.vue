<script setup>
import StickyChrome from "@vueda/components/StickyChrome.vue";
import "@vueda/theme/vueda-tailwind/shell/StickyBar.theme.js";
import { useScrollReveal } from "@vueda/use/useScrollReveal.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive, useSlots, useTemplateRef } from "vue";

/**
 * Renders a sticky toolbar that hides when the user scrolls down past its
 * initial position and reappears when they scroll back up or the scroll pauses.
 *
 * Two modes:
 *
 * - **Standalone (default).** The bar self-stickies to the window's scroll (or
 *   to `scrollRoot` when it lives inside a scrollable region) and drives its own
 *   hide/reveal via `useScrollReveal`. The `reveal` strategy is selectable;
 *   `scroll-up-or-idle` is the default (and original) behavior.
 * - **Zone-managed (`zone` set).** The bar teleports its surface into a
 *   `StickyStackProvider` zone (via `StickyChrome`) and lets that zone own the
 *   positioning and reveal, so it stacks with the page title and other chrome.
 *   When no provider is present the surface renders inline where the bar is
 *   placed.
 *
 * Exposes named `primary` (submit / primary actions, pushed to the start) and
 * `secondary` (read-only actions, contextual info) slots; falls back to the
 * default slot when neither named slot is bound.
 */
defineOptions({});

const root = useTemplateRef("root");
const slots = useSlots();
const props = defineProps({
    /**
     * When set (`top` / `bottom`), the bar teleports into that `StickyStackProvider` zone, which
     * owns its positioning and reveal; the bar does not stick itself. When `null` (the default) the
     * bar is standalone and self-stickies. Read once at mount; changing it later does not re-home
     * the bar.
     */
    zone: {
        type: String,
        default: null,
        validator: (value) => value === null || ["top", "bottom"].includes(value),
    },
    /** Sort order of this bar within its zone's stack, ascending top to bottom. Only used when `zone` is set. */
    order: {
        type: Number,
        default: 0,
    },
    /**
     * Reveal behavior: a strategy string (`always`, `scroll-up`, `scroll-up-or-idle`) or a boolean
     * (revealed when `true`). In standalone mode it drives the bar's own `useScrollReveal`; in
     * zone-managed mode it is forwarded to the zone. Defaults to `scroll-up-or-idle` (a submit /
     * action bar that returns the moment scrolling settles).
     * @type {import('vue').PropType<import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy | boolean>}
     */
    reveal: {
        type: [String, Boolean],
        default: "scroll-up-or-idle",
        validator: (value) =>
            typeof value === "boolean" || ["always", "scroll-up", "scroll-up-or-idle"].includes(value),
    },
    /**
     * Scroll container the bar reacts to. Pass the scrollable element (or a ref
     * to one) when the bar lives inside a scrollable region rather than the
     * page; the hide/reveal threshold and the scroll listener bind to it. When
     * `null` (the default) the bar reacts to the window. Standalone mode only;
     * in zone-managed mode the provider owns the scroll model.
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

// Zone-managed bars do not run a scroll tracker: the StickyStackProvider zone owns positioning and
// reveal, and the standalone root (whose `hidden` this would feed) is not rendered. `zone` is fixed
// at mount, so this one-time branch is stable for the instance's lifetime.
const { hidden } = props.zone
    ? { hidden: computed(() => false) }
    : useScrollReveal(root, { reveal: () => props.reveal, scrollRoot: () => props.scrollRoot });

const theme = useTheme("StickyBar", props, reactive({ hidden }));
</script>
<template>
    <!-- Zone-managed: teleport the surface into a StickyStackProvider zone (which owns positioning
         and reveal); renders inline here when no provider is present. -->
    <sticky-chrome v-if="zone" :zone="zone" :order="order" :reveal="reveal">
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
    </sticky-chrome>
    <!-- Standalone: self-stickies to the window (or `scrollRoot`) and drives its own reveal. -->
    <div v-else ref="root" :class="theme('root')" :style="theme.hideStyle?.value" data-qa="sticky-bar-root">
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
