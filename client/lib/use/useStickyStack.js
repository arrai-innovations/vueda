/**
 * @module use/useStickyStack
 * @description Shares the framework-owned sticky chrome stack between the layout-level
 * `StickyStackProvider` and the active routed views. The provider calls `useStickyStack()` with no
 * argument to establish and read the context (provider role); a view (usually via the `StickyChrome`
 * component) calls `useStickyStack(registration)` to register a bar into a zone and receive the
 * element to teleport its chrome into (view role). This mirrors `usePageTitle`: the provider owns
 * where the chrome lives and how the stack lays out, while the view owns the chrome's content.
 *
 * Two zones exist: `top` (bars pinned to the top of the scroll viewport) and `bottom` (pinned to the
 * bottom). Within a zone the bars form an ordered stack (by `order`); each is an independent sticky
 * element with its own reveal behavior, so the title can stay pinned while a filter toolbar hides on
 * scroll-down and a form-action bar reveals on idle. Registrations coexist (no winner) and the
 * provider lays them out; route transitions briefly show both the leaving and entering views' bars,
 * which is fine since they simply stack until the leaving view unmounts and cleans up.
 */
import { StickyStackContextSymbol } from "@vueda/utils/symbols.js";
import {
    computed,
    getCurrentScope,
    inject,
    markRaw,
    onScopeDispose,
    provide,
    ref,
    shallowRef,
    toValue,
    unref,
} from "vue";

/**
 * @typedef {'top' | 'bottom'} StickyZoneName
 */

/**
 * @typedef {import('vue').MaybeRefOrGetter<import('@vueda/use/useScrollReveal.js').ScrollRevealStrategy | boolean>} StickyReveal
 */

/**
 * @typedef {object} StickyStackRegistration
 * @property {StickyZoneName} [zone] - The zone the bar belongs to. Fixed at registration time. Defaults to `top`.
 * @property {import('vue').MaybeRefOrGetter<number>} [order] - Sort order within the zone (ascending, top to bottom). May be reactive to reorder bars at runtime. Defaults to `0`.
 * @property {StickyReveal} [reveal] - This bar's reveal behavior: a strategy string or a boolean, or a ref/getter of either for a reactive reason (for example, reveal a bulk-action bar only while there is a selection). When omitted, the bar stays visible (`always`).
 */

/**
 * @typedef {object} StickyStackEntry
 * @property {string} id - Stable identifier for this registration (use as a list key).
 * @property {import('vue').MaybeRefOrGetter<number>} order - The bar's sort order within its zone, as registered (possibly reactive).
 * @property {StickyReveal} [reveal] - The bar's reveal behavior, as registered (possibly a ref or getter).
 * @property {import('vue').ShallowRef<HTMLElement|null>} el - The bar element, set by the provider; the view teleports its chrome into it.
 * @property {import('vue').ComputedRef<HTMLElement|null>} target - The teleport target, resolved from `el`; `null` until the provider binds it (or when there is no provider above).
 * @property {() => void} stop - Removes this registration. Called automatically on scope dispose when registered inside an effect scope.
 */

/**
 * @typedef {object} StickyStackContext
 * @property {(zone: StickyZoneName) => import('vue').ComputedRef<StickyStackEntry[]>} zoneRegistrations - The registrations for a zone, sorted by `order` (ascending).
 * @property {(registration?: StickyStackRegistration) => StickyStackEntry} register - Register a bar into a zone. Returns the entry (teleport target, element ref, cleanup).
 */

/**
 * Establish the sticky-stack context (provider role).
 *
 * @overload
 * @returns {StickyStackContext}
 */
/**
 * Register a bar and contribute to the context (view role).
 *
 * @overload
 * @param {StickyStackRegistration} registration
 * @returns {StickyStackEntry}
 */
/**
 * Establish the sticky-stack context (provider role) or contribute to it (view role).
 *
 * Calling with no argument returns the context, establishing it on the first call up the tree and
 * reusing it thereafter (provider role). Calling with a registration injects the context and
 * registers a bar, returning a {@link StickyStackEntry} (view role). When no provider sits above (a
 * view rendered standalone, or a test harness) the view role degrades to an entry whose `target` is
 * always `null`, so `StickyChrome` renders its slot in place.
 *
 * @param {StickyStackRegistration} [registration] - A zone + order + reveal registration. Omit to take the provider role.
 * @returns {StickyStackContext|StickyStackEntry} The context (provider role) or a registration entry (view role).
 */
export function useStickyStack(registration) {
    const existing = inject(StickyStackContextSymbol, null);

    // View role: register a bar in the context the provider established above us.
    if (registration !== undefined) {
        if (existing) {
            return existing.register(registration);
        }
        // No provider above: a detached entry so StickyChrome renders its slot in place.
        const el = shallowRef(null);
        return { id: "sticky-detached", order: 0, reveal: undefined, el, target: computed(() => null), stop: () => {} };
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
    /** @type {{ [zone in StickyZoneName]: import('vue').Ref<StickyStackEntry[]> }} */
    const zones = {
        top: ref([]),
        bottom: ref([]),
    };
    let nextId = 0;

    /** @type {StickyStackContext['zoneRegistrations']} */
    const zoneRegistrations = (zone) =>
        computed(() => {
            const list = zones[zone]?.value ?? [];
            // Stable sort by resolved order (so a reactive `order` re-sorts) and equal orders keep
            // registration order.
            return [...list].sort((a, b) => toValue(a.order) - toValue(b.order));
        });

    /** @type {StickyStackContext['register']} */
    const register = ({ zone = "top", order = 0, reveal } = {}) => {
        const target = zones[zone] ? zone : "top";
        const el = shallowRef(null);
        // markRaw so the reactive zone array does not unwrap `el`/`target` (a ref read off a
        // reactive object returns its value, not the ref); the provider needs the ref itself.
        /** @type {StickyStackEntry} */
        const entry = markRaw({
            id: `sticky-${nextId++}`,
            order,
            reveal,
            el,
            target: computed(() => unref(el.value) ?? null),
            stop: () => {},
        });

        let cleaned = false;
        entry.stop = () => {
            if (cleaned) {
                return;
            }
            cleaned = true;
            const list = zones[target].value;
            const index = list.indexOf(entry);
            if (index !== -1) {
                list.splice(index, 1);
            }
        };

        zones[target].value.push(entry);
        if (getCurrentScope()) {
            onScopeDispose(entry.stop);
        }
        return entry;
    };

    /** @type {StickyStackContext} */
    const context = { zoneRegistrations, register };
    provide(StickyStackContextSymbol, context);
    return context;
}
