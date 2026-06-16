<script setup>
import "@vueda/theme/vueda-tailwind/shell/StickyBar.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, onBeforeUnmount, reactive, ref, unref, useSlots, useTemplateRef, watch } from "vue";

/**
 * Renders a sticky toolbar that hides when the user scrolls down past its
 * initial position and reappears when they scroll back up. By default it reacts
 * to the window's scroll; pass `scrollRoot` when the bar lives inside a
 * scrollable region so it pins to and reacts to that region instead. Exposes
 * named `primary` (submit / primary actions, pushed to the start) and
 * `secondary` (read-only actions, contextual info) slots; falls back to the
 * default slot when neither named slot is bound.
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

const isScrollingUp = ref(false);
const rootThreshold = ref(0);
const lastScrollY = ref(0);
const scrollTimeout = ref(null);
const delay = 300;

const isScrolledPastThreshold = computed(() => lastScrollY.value > rootThreshold.value);

// The window, or null during SSR. Resolved lazily so the module is import-safe
// on the server.
const browserWindow = () => (typeof window === "undefined" ? null : window);

// The element (or window) whose scroll drives the hide/reveal behavior. `unref`
// keeps it tolerant of either a raw element or a ref passed to `scrollRoot`.
const scrollTarget = computed(() => unref(props.scrollRoot) ?? browserWindow());

const isWindow = (target) => target === browserWindow();

const readScrollPosition = (target) => (isWindow(target) ? target.scrollY : target.scrollTop);

// The bar's bottom edge expressed in the scroll target's coordinate space: the
// scroll position past which the bar's original spot has left the viewport.
const measureThreshold = (target) => {
    const el = root.value;
    if (!el) {
        return 0;
    }
    if (isWindow(target)) {
        return el.getBoundingClientRect().bottom + target.scrollY;
    }
    return el.getBoundingClientRect().bottom - target.getBoundingClientRect().top + target.scrollTop;
};

const handleScroll = () => {
    const currentScrollY = readScrollPosition(scrollTarget.value);
    isScrollingUp.value = currentScrollY < lastScrollY.value;
    lastScrollY.value = currentScrollY;

    if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value);
    }

    scrollTimeout.value = setTimeout(() => {
        isScrollingUp.value = true;
    }, delay);
};

// Bind the scroll listener and recompute the threshold whenever the resolved
// target or the bar element changes (for example, once a `scrollRoot` ref
// resolves after its element mounts).
watch(
    [scrollTarget, root],
    ([target], previous) => {
        const previousTarget = previous ? previous[0] : undefined;
        if (previousTarget && previousTarget !== target) {
            previousTarget.removeEventListener("scroll", handleScroll);
        }
        if (target && target !== previousTarget) {
            target.addEventListener("scroll", handleScroll);
        }
        if (target) {
            rootThreshold.value = measureThreshold(target);
            lastScrollY.value = readScrollPosition(target);
        } else {
            rootThreshold.value = 0;
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    scrollTarget.value?.removeEventListener?.("scroll", handleScroll);
    if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value);
    }
});

const theme = useTheme(
    "StickyBar",
    props,
    reactive({
        hidden: computed(() => isScrolledPastThreshold.value && !isScrollingUp.value),
    }),
);
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
