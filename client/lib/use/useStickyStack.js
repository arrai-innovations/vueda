/**
 * @module use/useStickyStack
 * @description Shares the framework-owned sticky chrome zones between the layout-level
 * `StickyStackProvider` and the active routed view. The provider calls `useStickyStack()` with no
 * argument to establish and read the context (provider role); a view (usually via the `StickyChrome`
 * component) calls `useStickyStack(registration)` to register chrome into a named zone and receive
 * the element to teleport it into (view role). This mirrors `usePageTitle`: the provider owns where
 * sticky chrome lives and how it reveals, while the view stays responsible for the chrome's content.
 *
 * Two zones exist: `top` (pinned to the top of the scroll viewport) and `bottom` (pinned to the
 * bottom). Each zone is a single sticky wrapper, so its teleported children stack in normal flow
 * with no height math. A zone's reveal behavior is taken from the most recently registered chrome
 * that specifies one, falling back to the zone default, so the active view drives the zone while it
 * is mounted and route transitions hand off cleanly (the leaving and entering views briefly
 * coexist, newest wins).
 */
import { StickyStackContextSymbol } from "@vueda/utils/symbols.js";
import { computed, getCurrentScope, inject, onScopeDispose, provide, ref, shallowRef, toValue, unref } from "vue";

/**
 * @typedef {'top' | 'bottom'} StickyZoneName
 */

/**
 * @typedef {object} StickyStackRegistration
 * @property {StickyZoneName} [zone] - The zone the chrome teleports into. Defaults to `top`.
 * @property {import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy | boolean | import('vue').MaybeRefOrGetter<import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy | boolean>} [reveal] - The reveal behavior this chrome wants for its zone. May be reactive. When omitted, the zone keeps its default.
 */

/**
 * @typedef {object} StickyChromeHandle
 * @property {import('vue').ComputedRef<HTMLElement|null>} target - The zone element to teleport the chrome into, or `null` until the provider binds it (or when there is no provider above).
 * @property {() => void} stop - Removes this registration. Called automatically on scope dispose when registered inside an effect scope.
 */

/**
 * @typedef {object} StickyStackContext
 * @property {(zone: StickyZoneName) => import('vue').ComputedRef<HTMLElement|null>} zoneTarget - The teleport target element for a zone.
 * @property {(zone: StickyZoneName) => import('vue').ComputedRef<import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy | boolean>} zoneReveal - The active reveal behavior for a zone (newest registration wins; zone default otherwise).
 * @property {(zone: StickyZoneName, el: import('vue').Ref<HTMLElement|null>|HTMLElement|null) => void} bindZone - Bind the element (or element ref) the provider uses to host a zone's teleported chrome.
 * @property {(registration?: StickyStackRegistration) => StickyChromeHandle} register - Register chrome into a zone. Returns the teleport target and a cleanup function.
 */

/** @type {{ [zone in StickyZoneName]: import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy }} */
const ZONE_DEFAULT_REVEAL = {
    // The top zone (title + action chrome) holds context by default and only reveals on intent once
    // a view registers an action strategy. The bottom zone (pagination footer) always shows.
    top: "always",
    bottom: "always",
};

/**
 * Establish the sticky-stack context (provider role) or contribute to it (view role).
 *
 * Calling with no argument returns the context, establishing it on the first call up the tree and
 * reusing it thereafter (provider role). Calling with a registration injects the context and
 * registers chrome into the requested zone, returning a {@link StickyChromeHandle} (view role). When
 * no provider sits above (a view rendered standalone, or a test harness) the view role degrades to a
 * handle whose `target` is always `null`, so `StickyChrome` renders its slot in place.
 *
 * @param {StickyStackRegistration} [registration] - A zone + reveal registration. Omit to take the provider role.
 * @returns {StickyStackContext|StickyChromeHandle} The context (provider role) or a chrome handle (view role).
 */
export function useStickyStack(registration) {
    const existing = inject(StickyStackContextSymbol, null);

    // View role: register chrome into the context the provider established above us.
    if (registration !== undefined) {
        return existing ? existing.register(registration) : { target: computed(() => null), stop: () => {} };
    }

    // Provider role: reuse the context if one already exists up the tree, else establish it here.
    return existing ?? createStickyStackContext();
}

/**
 * Build a fresh sticky-stack context, provide it to descendants, and return it.
 *
 * @returns {StickyStackContext} The new context.
 */
function createStickyStackContext() {
    /**
     * Per-zone state: the bound host element and the live stack of registrations. A registration is
     * a unique object token so cleanup can splice exactly its own entry by reference.
     * @type {{ [zone in StickyZoneName]: { el: import('vue').ShallowRef<import('vue').Ref<HTMLElement|null>|HTMLElement|null>, entries: import('vue').Ref<{ reveal: * }[]> } }}
     */
    const zones = {
        top: { el: shallowRef(null), entries: ref([]) },
        bottom: { el: shallowRef(null), entries: ref([]) },
    };

    /** @type {StickyStackContext['zoneTarget']} */
    const zoneTarget = (zone) => computed(() => (zones[zone] ? (unref(zones[zone].el.value) ?? null) : null));

    /** @type {StickyStackContext['zoneReveal']} */
    const zoneReveal = (zone) =>
        computed(() => {
            const entries = zones[zone]?.entries.value;
            const top = entries && entries.length ? entries[entries.length - 1] : undefined;
            // Flatten here so consumers (the provider's useScrollReveal) get a plain string/boolean
            // even when a registration passed a ref or getter for its reveal.
            return toValue(top?.reveal ?? ZONE_DEFAULT_REVEAL[zone]);
        });

    /** @type {StickyStackContext['bindZone']} */
    const bindZone = (zone, el) => {
        if (zones[zone]) {
            zones[zone].el.value = el;
        }
    };

    /** @type {StickyStackContext['register']} */
    const register = ({ zone = "top", reveal } = {}) => {
        const target = zones[zone] ? zone : "top";
        const entry = { reveal };
        zones[target].entries.value.push(entry);

        let cleaned = false;
        const stop = () => {
            if (cleaned) {
                return;
            }
            cleaned = true;
            const index = zones[target].entries.value.indexOf(entry);
            if (index !== -1) {
                zones[target].entries.value.splice(index, 1);
            }
        };
        if (getCurrentScope()) {
            onScopeDispose(stop);
        }

        return { target: zoneTarget(target), stop };
    };

    /** @type {StickyStackContext} */
    const context = { zoneTarget, zoneReveal, bindZone, register };
    provide(StickyStackContextSymbol, context);
    return context;
}
