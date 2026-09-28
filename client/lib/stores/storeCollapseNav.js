/**
 * @module stores/storeCollapseNav
 * @description Pinia store for tracking and persisting the navigation sidebar collapsed/expanded state via localStorage.
 */
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
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
 *   import { storeCollapseNav } from "@vueda";
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
export const storeCollapseNav = defineStore("collapseNav", {
    state: () => ({
        /**
         * Whether the navigation sidebar is collapsed.
         *
         * @type {boolean}
         */
        isCollapsed: false,
    }),
    actions: {
        /**
         * Sets `isCollapsed` from localStorage. With no saved value, collapses the sidebar when the
         * viewport is at least the `lg` breakpoint.
         *
         * @returns {void}
         */
        init() {
            const storedCollapseNav = localStorage.getItem(collapseNavLocalStorageKey);
            const breakpoint = useBreakpoints(breakpointsVueda);
            this.isCollapsed =
                storedCollapseNav !== null ? JSON.parse(storedCollapseNav) : breakpoint.isGreaterOrEqual("lg");
        },
        /**
         * Flips `isCollapsed` and saves the new value to localStorage.
         *
         * @returns {void}
         */
        toggle() {
            this.isCollapsed = !this.isCollapsed;
            localStorage.setItem(collapseNavLocalStorageKey, JSON.stringify(this.isCollapsed));
        },
    },
});
