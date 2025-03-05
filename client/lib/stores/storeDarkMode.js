import { defineStore } from "pinia";

const darkModeLocalStorageKey = "darkMode";

const prefers = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * The store for the current dark mode state, and persisting it.
 *
 * @typedef {import('pinia').Store<
 *   'darkMode',
 *   {
 *       isDark: boolean,
 *   },
 *   {},
 *   {
 *     init: () => void,
 *     toggle: () => void
 *   }
 * >} DarkModeStore
 */

/**
 * The store for the current dark mode state, and persisting it.
 *
 * Usage:
 * ```js
 *   import { storeDarkMode } from "vueda-client";
 *   const darkMode = storeDarkMode();
 *
 *   darkMode.isDark; // reactive boolean for dark mode, true if dark mode is enabled
 *
 *   darkMode.init(); // get dark mode from local storage or prefers
 *   darkMode.toggle(); // toggle dark mode
 * ```
 *
 * @returns {DarkModeStore} The store for dark mode.
 */
export const storeDarkMode = defineStore("darkMode", {
    state: () => ({
        isDark: false,
    }),
    actions: {
        init() {
            const storedDarkMode = localStorage.getItem(darkModeLocalStorageKey);
            this.isDark = storedDarkMode !== null ? JSON.parse(storedDarkMode) : prefers();
        },
        toggle() {
            this.isDark = !this.isDark;
            localStorage.setItem(darkModeLocalStorageKey, JSON.stringify(this.isDark));
        },
    },
});
