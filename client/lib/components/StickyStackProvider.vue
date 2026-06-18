<script setup>
import "@vueda/theme/vueda-tailwind/shell/StickyStackProvider.theme.js";
import { revealHidden, useScrollReveal } from "@vueda/use/useScrollReveal.js";
import { useStickyStack } from "@vueda/use/useStickyStack.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { resolveStickyStack } from "@vueda/utils/stickyStackLayout.js";
import { computed, onMounted, onScopeDispose, reactive, toValue, useTemplateRef } from "vue";

/**
 * Hosts the framework-owned sticky chrome stack for a layout. Place it around the scrolling region
 * (inside the layout's main content area, wrapping `<RouterView>`); the window remains the scroll
 * container, so this component introduces no `overflow`. It renders an ordered stack of
 * independently-revealing sticky bars pinned to the top and bottom of the viewport, establishes the
 * `useStickyStack` context so the active view can teleport chrome into either zone (via
 * `StickyChrome`), and publishes the visible top-stack height as `--vueda-sticky-stack-top` for
 * descendants (such as a sticky grid header) to offset against.
 *
 * The page title goes in the `top` slot (plain composition); it is the always-pinned first bar of
 * the top stack, and the view's chrome (filters, form actions) stacks below it, each revealing on
 * its own schedule. Each bar's sticky offset is the cumulative height of the visible bars between it
 * and the viewport edge, so hiding one bar compacts the rest with no offsets crossing the layout
 * boundary.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const TITLE_KEY = "__title__";
const BOTTOM_KEY = "__bottom__";
// Bars sit in the chrome z-band; the layout's relative order stacks them within it.
const Z_BASE = 30;

const stack = useStickyStack();
const topRegs = stack.zoneRegistrations("top");
const bottomRegs = stack.zoneRegistrations("bottom");

const root = useTemplateRef("root");
const topSentinel = useTemplateRef("topSentinel");
const bottomSentinel = useTemplateRef("bottomSentinel");

// One scroll tracker per edge, anchored to a zero-height sentinel that marks where the pinned stack
// ends, so every bar in that zone shares one set of signals and applies its own reveal strategy.
const topSignals = useScrollReveal(topSentinel, { reveal: "always" });
const bottomSignals = useScrollReveal(bottomSentinel, { reveal: "always" });
const topState = computed(() => ({
    isScrollingUp: topSignals.isScrollingUp.value,
    isPastThreshold: topSignals.isPastThreshold.value,
    isIdle: topSignals.isIdle.value,
}));
const bottomState = computed(() => ({
    isScrollingUp: bottomSignals.isScrollingUp.value,
    isPastThreshold: bottomSignals.isPastThreshold.value,
    isIdle: bottomSignals.isIdle.value,
}));

// Measured bar heights, keyed by bar key (TITLE_KEY / BOTTOM_KEY / registration id). One
// ResizeObserver keeps them current; the layout math reads them.
const heights = reactive({});
const barEls = new Map();
/** @type {ResizeObserver | undefined} */
let resizeObserver;

const setBarEl = (key) => (el) => {
    const previous = barEls.get(key);
    if (previous && previous !== el) {
        resizeObserver?.unobserve(previous);
    }
    if (el) {
        el.__stickyStackKey = key;
        barEls.set(key, el);
        resizeObserver?.observe(el);
        heights[key] = el.getBoundingClientRect().height;
    } else if (previous) {
        barEls.delete(key);
        delete heights[key];
    }
};
const titleBarEl = setBarEl(TITLE_KEY);
const bottomBarEl = setBarEl(BOTTOM_KEY);

// Stable per-registration ref binders: set the measured element and the registration's teleport
// target together, and drop the binder when the bar unmounts.
const regBinders = new Map();
const bindRegEl = (reg) => {
    let binder = regBinders.get(reg.id);
    if (!binder) {
        const setEl = setBarEl(reg.id);
        binder = (el) => {
            setEl(el);
            reg.el.value = el ?? null;
            if (!el) {
                regBinders.delete(reg.id);
            }
        };
        regBinders.set(reg.id, binder);
    }
    return binder;
};

const hiddenForReg = (reg, state) => revealHidden(toValue(reg.reveal) ?? "always", state);

// Top stack: the always-pinned title first, then registered bars in order, each hiding per its own
// reveal strategy against the shared top signals.
const topBars = computed(() => [
    { key: TITLE_KEY, height: heights[TITLE_KEY] || 0, hidden: false },
    ...topRegs.value.map((reg) => ({
        key: reg.id,
        height: heights[reg.id] || 0,
        hidden: hiddenForReg(reg, topState.value),
    })),
]);
const topResolved = computed(() => resolveStickyStack(topBars.value, "top"));

// Bottom stack: resolved from the bottom edge outward — the bottom slot bar is the anchor, then the
// registered bars stacking upward (so their visual order is reversed for the edge-outward math).
const bottomBars = computed(() => [
    { key: BOTTOM_KEY, height: heights[BOTTOM_KEY] || 0, hidden: false },
    ...[...bottomRegs.value].reverse().map((reg) => ({
        key: reg.id,
        height: heights[reg.id] || 0,
        hidden: hiddenForReg(reg, bottomState.value),
    })),
]);
const bottomResolved = computed(() => resolveStickyStack(bottomBars.value, "bottom"));

const layoutByKey = (bars, resolved) => {
    const map = {};
    bars.forEach((bar, index) => {
        map[bar.key] = resolved.bars[index];
    });
    return map;
};
const topLayout = computed(() => layoutByKey(topBars.value, topResolved.value));
const bottomLayout = computed(() => layoutByKey(bottomBars.value, bottomResolved.value));

const barStyle = (key, edge) => {
    const layout = (edge === "top" ? topLayout.value : bottomLayout.value)[key];
    if (!layout) {
        return undefined;
    }
    return {
        [edge]: `${layout.offset}px`,
        transform: `translateY(${layout.translate}px)`,
        zIndex: String(Z_BASE + layout.zIndex),
    };
};

// The grid-header offset: the height the visible top stack occupies at the viewport top.
const rootStyle = computed(() => ({ "--vueda-sticky-stack-top": `${topResolved.value.visibleExtent}px` }));

onMounted(() => {
    if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const key = entry.target.__stickyStackKey;
                if (key) {
                    heights[key] = entry.target.getBoundingClientRect().height;
                }
            }
        });
        for (const el of barEls.values()) {
            resizeObserver.observe(el);
        }
    }
    if (import.meta.env?.DEV) {
        warnOnScrollBlockingAncestor(root.value);
    }
});
onScopeDispose(() => resizeObserver?.disconnect());

/**
 * Window-relative `position: sticky` silently fails inside any ancestor with a non-visible
 * `overflow`. In dev, walk the ancestor chain and warn (naming the offender) so the failure is loud
 * instead of silent. No-op in production builds.
 *
 * @param {HTMLElement|null} el
 * @returns {void}
 */
function warnOnScrollBlockingAncestor(el) {
    if (!el || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
        return;
    }
    let node = el.parentElement;
    const documentRoot = el.ownerDocument?.documentElement;
    while (node && node !== documentRoot) {
        const style = window.getComputedStyle(node);
        for (const axis of ["overflowX", "overflowY"]) {
            const value = style[axis];
            if (value && value !== "visible") {
                console.warn(
                    `[vueda] StickyStackProvider: ancestor <${node.tagName.toLowerCase()}> sets ${axis}: ${value}, ` +
                        `which makes window-relative position:sticky pin to it instead of the viewport. ` +
                        `Remove the overflow from that ancestor, or move the scroll boundary.`,
                    node,
                );
                return;
            }
        }
        node = node.parentElement;
    }
}

const theme = useTheme("StickyStackProvider", props);
</script>
<template>
    <div ref="root" :class="[theme('root'), props.class]" :style="rootStyle" data-qa="sticky-stack-root">
        <!-- Top stack: title (always pinned), then teleported view chrome below it. -->
        <div
            :ref="titleBarEl"
            :class="theme('bar')"
            :style="barStyle(TITLE_KEY, 'top')"
            data-qa="sticky-stack-title-bar"
        >
            <!-- @slot [top] Pinned top chrome placed by the integrator, typically the page title. The always-visible first bar of the top stack. -->
            <slot name="top" />
        </div>
        <div
            v-for="reg in topRegs"
            :key="reg.id"
            :ref="bindRegEl(reg)"
            :class="theme('bar')"
            :style="barStyle(reg.id, 'top')"
            data-qa="sticky-stack-top-bar"
        />
        <div ref="topSentinel" aria-hidden="true" class="h-0" data-qa="sticky-stack-top-sentinel" />
        <!-- @slot Scrolling page content, typically the router view. -->
        <slot />
        <div ref="bottomSentinel" aria-hidden="true" class="h-0" data-qa="sticky-stack-bottom-sentinel" />
        <!-- Bottom stack: teleported view chrome (e.g. pagination), then the bottom slot anchor. -->
        <div
            v-for="reg in bottomRegs"
            :key="reg.id"
            :ref="bindRegEl(reg)"
            :class="theme('bar')"
            :style="barStyle(reg.id, 'bottom')"
            data-qa="sticky-stack-bottom-bar"
        />
        <div
            :ref="bottomBarEl"
            :class="theme('bar')"
            :style="barStyle(BOTTOM_KEY, 'bottom')"
            data-qa="sticky-stack-bottom-anchor"
        >
            <!-- @slot [bottom] Pinned bottom chrome placed by the integrator, the bottom-most bar of the bottom stack. -->
            <slot name="bottom" />
        </div>
    </div>
</template>

<style scoped></style>
