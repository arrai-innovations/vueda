/**
 * @module use/usePageTitle
 * @description Shares page-level identity (title, loading) and a page-action zone between a
 * layout-level display component and the active routed view. The display calls `usePageTitle()`
 * with no arguments to establish and read the context; a view calls `usePageTitle(source)` with a
 * getter to contribute its own title and loading state. This keeps the page `<h1>` an integrator
 * concern (rendered wherever the layout wants) while the view stays responsible for the data.
 */
import { PageTitleContextSymbol } from "@vueda/utils/symbols.js";
import { computed, getCurrentScope, inject, onScopeDispose, provide, ref, shallowRef, unref } from "vue";

/**
 * @typedef {object} PageTitleEntry
 * @property {string} [title] - The page title text.
 * @property {boolean} [loading] - Whether the page is currently loading.
 */

/**
 * @typedef {object} PageTitleContext
 * @property {import('vue').ComputedRef<PageTitleEntry>} current - The active entry (the most recently registered source), or an empty object when no view has registered one.
 * @property {import('vue').ComputedRef<HTMLElement|null>} actionTarget - The element page actions teleport into, resolved from the zone the display bound. `null` until a zone is bound.
 * @property {(source: () => PageTitleEntry) => (() => void)} register - Register a title source. Returns a cleanup function and, when called inside an effect scope, clears itself automatically on dispose.
 * @property {(zone: import('vue').Ref<HTMLElement|null>|HTMLElement|null) => void} bindActionZone - Bind the element (or element ref) the display uses to host teleported page actions.
 */

/**
 * Establish the page-title context (display role) or contribute to it (view role).
 *
 * Calling with no argument establishes a fresh context, provides it to descendants, and returns it
 * for the display to render. Calling with a source getter injects the nearest context and registers
 * the getter as the active title source.
 *
 * @param {() => PageTitleEntry} [source] - A getter returning the current view's title and loading state. Omit to take the display role.
 * @returns {PageTitleContext|(() => void)|undefined} The context (display role); a cleanup function (view role with a context present); or `undefined` (view role with no context above, e.g. a view rendered standalone).
 */
export function usePageTitle(source) {
    // View role: contribute a title source to whatever display established the context above us.
    if (source !== undefined) {
        const context = inject(PageTitleContextSymbol, null);
        // No display above (standalone view, test harness): contributing is a harmless no-op.
        return context ? context.register(source) : undefined;
    }

    // Display role: establish a fresh context, even if one exists above, so a nested display
    // (e.g. a modal shell) gets its own title and action zone rather than leaking into the parent.
    return createPageTitleContext();
}

/**
 * Build a fresh page-title context, provide it to descendants, and return it.
 *
 * @returns {PageTitleContext} The new context.
 */
function createPageTitleContext() {
    // A stack rather than a single slot: route transitions briefly mount the leaving and entering
    // views at once, so the most recently registered source wins and cleanup pops just that entry.
    /** @type {import('vue').Ref<(() => PageTitleEntry)[]>} */
    const sources = ref([]);
    /** @type {import('vue').ShallowRef<import('vue').Ref<HTMLElement|null>|HTMLElement|null>} */
    const zone = shallowRef(null);

    const current = computed(() => {
        const top = sources.value[sources.value.length - 1];
        return top ? top() : {};
    });
    const actionTarget = computed(() => (zone.value ? (unref(zone.value) ?? null) : null));

    /** @type {PageTitleContext['register']} */
    const register = (source) => {
        sources.value.push(source);
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) {
                return;
            }
            cleaned = true;
            const index = sources.value.indexOf(source);
            if (index !== -1) {
                sources.value.splice(index, 1);
            }
        };
        if (getCurrentScope()) {
            onScopeDispose(cleanup);
        }
        return cleanup;
    };

    /** @type {PageTitleContext['bindActionZone']} */
    const bindActionZone = (zoneRef) => {
        zone.value = zoneRef;
    };

    /** @type {PageTitleContext} */
    const context = { current, actionTarget, register, bindActionZone };
    provide(PageTitleContextSymbol, context);
    return context;
}
