/**
 * @module use/useScrollReveal
 * @description Tracks scroll direction against a scroll target (the window or a scrollable
 * container) and derives a `hidden` flag for page chrome that should slide out of view while the
 * user reads and return on intent. The reveal strategy is selectable per consumer so a single
 * scroll model can drive different tiers of sticky chrome: a submit bar that should return the
 * moment scrolling pauses, a space-reclaiming toolbar that should stay hidden until a deliberate
 * scroll up, or a footer that never hides. Extracted from `StickyBar` so the sticky-stack zones can
 * reuse the same logic with a different reveal behavior per zone.
 */
import { computed, onScopeDispose, ref, toValue, unref, watch } from "vue";

/**
 * @typedef {'always' | 'scroll-up' | 'scroll-up-or-idle'} ScrollRevealStrategy
 *
 * - `always`: never hides. `hidden` stays `false` regardless of scroll position.
 * - `scroll-up`: hides once the element's original position has scrolled out of view and stays
 *   hidden until the user scrolls up. No idle reveal, so it does not pop back when the user pauses
 *   to read; suited to the space-reclaiming toolbar tier.
 * - `scroll-up-or-idle`: like `scroll-up`, but also reveals after scrolling pauses for `idleDelay`
 *   milliseconds. Suited to a submit / action bar the user should be able to return to quickly.
 *
 * A `reveal` that resolves to a boolean instead of one of these strings hands visibility control
 * back to the caller entirely: `true` means revealed (`hidden` is `false`), `false` means hidden.
 * Pass a boolean ref/getter (typically a `computed`) to drive show/hide from the view's own logic;
 * in that mode scroll position is ignored.
 */

/**
 * @typedef {object} ScrollRevealOptions
 * @property {import('vue').MaybeRefOrGetter<ScrollRevealStrategy | boolean>} [reveal] - The reveal strategy, or a boolean (revealed when `true`); pass a ref or getter of either to drive it reactively. Defaults to `scroll-up-or-idle`.
 * @property {import('vue').MaybeRefOrGetter<HTMLElement|null>} [scrollRoot] - The scroll container the behavior reacts to. Pass the scrollable element (or a ref/getter to one) when the chrome lives inside a scrollable region; the hide/reveal threshold and the scroll listener bind to it. When nullish (the default) the behavior reacts to the window.
 * @property {number} [idleDelay] - Milliseconds of scroll inactivity after which the `scroll-up-or-idle` strategy reveals the chrome. Defaults to 300.
 */

/**
 * @typedef {object} ScrollRevealState
 * @property {boolean} isScrollingUp - Whether the most recent scroll moved toward the top.
 * @property {boolean} isPastThreshold - Whether the scroll position is past the element's original bottom edge (the chrome's spot has left the viewport).
 * @property {boolean} isIdle - Whether scrolling has settled for at least `idleDelay` since the last scroll.
 */

/**
 * @typedef {object} ScrollRevealContext
 * @property {import('vue').ComputedRef<boolean>} hidden - `true` while the chrome should be translated out of view.
 * @property {import('vue').Ref<boolean>} isScrollingUp - Live `isScrollingUp` signal (see {@link ScrollRevealState}).
 * @property {import('vue').ComputedRef<boolean>} isPastThreshold - Live `isPastThreshold` signal (see {@link ScrollRevealState}).
 * @property {import('vue').Ref<boolean>} isIdle - Live `isIdle` signal (see {@link ScrollRevealState}).
 */

/**
 * Derive a reactive `hidden` flag from scroll direction for hide-on-scroll page chrome.
 *
 * Binds a scroll listener to the resolved target (rebinding if `scrollRoot` changes), measures the
 * element's original bottom edge as the threshold past which it counts as scrolled away, and
 * exposes `hidden` according to the chosen `reveal` strategy. The listener and any pending idle
 * timer are torn down automatically when the surrounding effect scope is disposed (component
 * unmount, or an explicit `effectScope().stop()`), so callers do not manage cleanup.
 *
 * @param {import('vue').Ref<HTMLElement|null>} rootRef - Ref to the element whose original on-screen position defines the hide threshold (typically the chrome's own root).
 * @param {ScrollRevealOptions} [options] - Reveal strategy, scroll container, and idle timing.
 * @returns {ScrollRevealContext} The reactive `hidden` flag plus the raw scroll signals (so a multi-bar host can reuse one tracker across bars).
 */
/**
 * Resolve whether chrome should be hidden, given a reveal strategy and the current scroll signals.
 *
 * Pure and synchronous so it can be reused per bar by a multi-bar host (each bar applies its own
 * strategy against one shared set of scroll signals) as well as by {@link useScrollReveal} itself.
 *
 * @param {ScrollRevealStrategy | boolean} strategy - The reveal strategy, or a boolean (revealed when `true`).
 * @param {ScrollRevealState} state - The current scroll signals.
 * @returns {boolean} `true` when the chrome should be hidden.
 */
export function revealHidden(strategy, { isScrollingUp, isPastThreshold, isIdle }) {
    // A boolean hands visibility to the caller: `true` reveals, `false` hides.
    if (typeof strategy === "boolean") {
        return !strategy;
    }
    if (strategy === "always") {
        return false;
    }
    if (!isPastThreshold || isScrollingUp) {
        return false;
    }
    // Scrolled down past the threshold: hidden, unless this strategy also reveals on idle and the
    // scroll has since settled.
    return !(strategy === "scroll-up-or-idle" && isIdle);
}

export function useScrollReveal(rootRef, options = {}) {
    const idleDelay = options.idleDelay ?? 300;
    const reveal = computed(() => toValue(options.reveal) ?? "scroll-up-or-idle");

    const isScrollingUp = ref(false);
    const isIdle = ref(false);
    const rootThreshold = ref(0);
    const lastScrollY = ref(0);
    let scrollTimeout = null;

    const isPastThreshold = computed(() => lastScrollY.value > rootThreshold.value);

    // The window, or null during SSR. Resolved lazily so the module is import-safe on the server.
    const browserWindow = () => (typeof window === "undefined" ? null : window);

    // The element (or window) whose scroll drives the behavior. `unref(toValue(...))` tolerates a
    // raw element, a ref, or a getter returning either.
    const scrollTarget = computed(() => unref(toValue(options.scrollRoot)) ?? browserWindow());

    const isWindow = (target) => target === browserWindow();
    const readScrollPosition = (target) => (isWindow(target) ? target.scrollY : target.scrollTop);

    // The element's bottom edge expressed in the scroll target's coordinate space: the scroll
    // position past which the element's original spot has left the viewport.
    const measureThreshold = (target) => {
        const el = rootRef.value;
        if (!el) {
            return 0;
        }
        if (isWindow(target)) {
            return el.getBoundingClientRect().bottom + target.scrollY;
        }
        return el.getBoundingClientRect().bottom - target.getBoundingClientRect().top + target.scrollTop;
    };

    const clearIdleTimer = () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = null;
        }
    };

    const handleScroll = () => {
        const currentScrollY = readScrollPosition(scrollTarget.value);
        isScrollingUp.value = currentScrollY < lastScrollY.value;
        lastScrollY.value = currentScrollY;

        // `isIdle` is a shared signal (scrolling has settled); each strategy decides whether it
        // matters. Reset it on every scroll and re-arm the timer.
        isIdle.value = false;
        clearIdleTimer();
        scrollTimeout = setTimeout(() => {
            isIdle.value = true;
        }, idleDelay);
    };

    // Bind the scroll listener and recompute the threshold whenever the resolved target or the
    // element changes (for example, once a `scrollRoot` ref resolves after its element mounts).
    watch(
        [scrollTarget, rootRef],
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

    onScopeDispose(() => {
        scrollTarget.value?.removeEventListener?.("scroll", handleScroll);
        clearIdleTimer();
    });

    const hidden = computed(() =>
        revealHidden(reveal.value, {
            isScrollingUp: isScrollingUp.value,
            isPastThreshold: isPastThreshold.value,
            isIdle: isIdle.value,
        }),
    );

    return { hidden, isScrollingUp, isPastThreshold, isIdle };
}
