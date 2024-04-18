import { defineStore } from "pinia";

const darkModeLocalStorageKey = "darkMode";

const prefers = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * storeDarkMode - pinia store for dark mode
 * Usage:
 * ```js
 *   import { storeDarkMode } from "vueda-client";
 *   const darkMode = storeDarkMode();
 *
 *   darkMode.isDark; // reactive boolean for dark mode, true if dark mode is enabled
 *
 *   darkMode.initializeDarkMode(); // get dark mode from local storage or prefers
 *   darkMode.toggleDarkMode(); // toggle dark mode
 * ```
 */
export default defineStore({
    id: "darkMode",
    state: () => ({
        isDark: false,
    }),
    actions: {
        initializeDarkMode() {
            const storedDarkMode = localStorage.getItem(darkModeLocalStorageKey);
            this.isDark = storedDarkMode !== null ? JSON.parse(storedDarkMode) : prefers();
        },
        toggleDarkMode() {
            this.isDark = !this.isDark;
            localStorage.setItem(darkModeLocalStorageKey, JSON.stringify(this.isDark));
        },
    },
});
