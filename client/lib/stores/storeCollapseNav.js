import { breakpointsTailwind } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import { defineStore } from "pinia";

const collapseNavLocalStorageKey = "collapseNav";

/**
 * The store for the current collapse nav state, and persisting it.
 *
 * @typedef {import('pinia').Store<
 *   'collapseNav',
 *   {
 *       isCollapsed: boolean,
 *   },
 *   {},
 *   {
 *     init: () => void,
 *     toggle: () => void
 *   }
 * >} CollapseNavStore
 */

/**
 * The store for the current collapse nav state, and persisting it.
 *
 * Usage:
 * ```js
 *   import { storeCollapseNav } from "vueda-client";
 *   const collapseNav = storeCollapseNav();
 *
 *   collapseNav.isCollapsed; // reactive boolean for collapsed nav, true if nav is collapsed
 *
 *   collapseNav.init(); // get collapse state from local storage or default based on breakpoint
 *   collapseNav.toggle(); // toggle collapse state
 * ```
 *
 * @returns {CollapseNavStore} The store for collapse nav.
 */
export const storeCollapseNav = defineStore({
    id: "collapseNav",
    state: () => ({
        isCollapsed: false,
    }),
    actions: {
        init() {
            const storedCollapseNav = localStorage.getItem(collapseNavLocalStorageKey);
            const breakpoint = useBreakpoints(breakpointsTailwind);
            this.isCollapsed =
                storedCollapseNav !== null ? JSON.parse(storedCollapseNav) : breakpoint.isGreaterOrEqual("lg");
        },
        toggle() {
            this.isCollapsed = !this.isCollapsed;
            localStorage.setItem(collapseNavLocalStorageKey, JSON.stringify(this.isCollapsed));
        },
    },
});
