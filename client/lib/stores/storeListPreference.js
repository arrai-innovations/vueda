/**
 * @module stores/storeListPreference
 * @description Pinia store for persisting per-model ViewList preferences (hidden columns, filters, and sorting) to localStorage.
 */
import { getAppModelDotName } from "@vueda/utils/case.js";
import isEqual from "lodash-es/isEqual.js";
import { defineStore } from "pinia";

const STORAGE_KEY = "listPreference";

const saveToLocalStorage = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save view list preferences to localStorage:", error);
    }
};
/**
 * Store for persisting ViewList preferences (hidden columns, filters, sorting)
 * per app/model pair. Keys in `preferences` are built via `getAppModelDotName`,
 * usually in the form `${app}.${model}`.
 *
 *
 * @typedef ListPreferenceArgs
 * @property {string} app
 * @property {string} model

 * @typedef ListPreferenceEntry
 * @property {string[]=} hiddenColumns           - Columns that should be hidden.
 * @property {object=} filters  - Filters keyed by field/param name.
 * @property {string[]=} sorting - Sorting configuration.
 * @property {(number|string)=} perPage - Rows per page (a number, or the all-pages sentinel `"all"`).
 *
 * @typedef ListPreferenceState
 * @property {boolean} initialized
 * @property {Record<string, ListPreferenceEntry>} preferences
 *
 * @typedef {ReturnType<typeof storeListPreference>} ListPreferenceStore
 */

export const storeListPreference = defineStore("listPreference", {
    state: () => ({
        /**
         * Whether `init` has loaded the saved preferences from localStorage.
         *
         * @type {boolean}
         */
        initialized: false,
        /**
         * Saved list preferences keyed by the app and model dot name from `getAppModelDotName`.
         *
         * @type {{[appModel: string]: ListPreferenceEntry}}
         */
        preferences: {},
    }),
    getters: {
        /**
         * Returns a function that gives a copy of all saved preferences for one app and model.
         *
         * @param {ListPreferenceState} state - The store state.
         * @returns {(args: ListPreferenceArgs) => ListPreferenceEntry} A function that returns the
         *     saved entry, or an empty object when none is saved.
         */
        getPreferences: (state) => (args) => {
            const key = getAppModelDotName(args);
            return state.preferences[key] ? { ...state.preferences[key] } : {};
        },

        /**
         * Returns a function that gives a copy of the hidden column names for one app and model.
         *
         * @param {ListPreferenceState} state - The store state.
         * @returns {(args: ListPreferenceArgs) => string[]} A function that returns the hidden
         *     column names, or an empty array when none are saved.
         */
        getHiddenColumns: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            const hidden = prefs?.hiddenColumns;

            return Array.isArray(hidden) ? [...hidden] : [];
        },

        /**
         * Returns a function that gives a copy of the saved filters for one app and model.
         *
         * @param {ListPreferenceState} state - The store state.
         * @returns {(args: ListPreferenceArgs) => {[param: string]: unknown}} A function that returns
         *     the filters keyed by query parameter name, or an empty object when none are saved.
         */
        getFilters: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            return prefs?.filters ? { ...prefs.filters } : {};
        },

        /**
         * Returns a function that gives a copy of the saved sort fields for one app and model.
         *
         * @param {ListPreferenceState} state - The store state.
         * @returns {(args: ListPreferenceArgs) => (string[] | null)} A function that returns the
         *     sort fields, or null when no sorting is saved.
         */
        getSorting: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            return Array.isArray(prefs?.sorting) ? [...prefs.sorting] : null;
        },

        /**
         * Returns a function that gives the saved rows per page for one app and model.
         *
         * @param {ListPreferenceState} state - The store state.
         * @returns {(args: ListPreferenceArgs) => (number | string | null)} A function that returns
         *     the row count or `"all"`, or null when no value is saved.
         */
        getPerPage: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            const perPage = prefs?.perPage;
            return typeof perPage === "number" || typeof perPage === "string" ? perPage : null;
        },
    },
    actions: {
        /**
         * Loads saved preferences from localStorage once. Later calls do nothing. A read or parse
         * failure logs a warning and leaves the store uninitialized.
         *
         * @returns {void}
         */
        init() {
            if (this.initialized) {
                return;
            }
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                this.preferences = stored ? JSON.parse(stored) : {};
                this.initialized = true;
            } catch (error) {
                console.warn("Failed to load list preferences from localStorage:", error);
            }
        },
        /**
         * Saves the hidden column names for one app and model. An empty or non-array value removes
         * the saved hidden columns.
         *
         * @param {ListPreferenceArgs} args - The app and model the preference belongs to.
         * @param {string[]} hiddenColumns - The column names to hide.
         * @returns {void}
         */
        setHiddenColumns(args, hiddenColumns) {
            const key = getAppModelDotName(args);
            const hasValue = Array.isArray(hiddenColumns) && hiddenColumns.length > 0;
            this._updatePreference(key, "hiddenColumns", hasValue ? hiddenColumns : undefined);
        },

        /**
         * Saves the filters for one app and model. An empty or missing object removes the saved
         * filters.
         *
         * @param {ListPreferenceArgs} args - The app and model the preference belongs to.
         * @param {{[param: string]: unknown}} filters - Filter values keyed by query parameter name.
         * @returns {void}
         */
        setFilters(args, filters) {
            const key = getAppModelDotName(args);
            const hasValue = filters && Object.keys(filters).length > 0;
            this._updatePreference(key, "filters", hasValue ? filters : undefined);
        },

        /**
         * Saves the sort fields for one app and model. An empty or non-array value removes the
         * saved sorting.
         *
         * @param {ListPreferenceArgs} args - The app and model the preference belongs to.
         * @param {string[]} sorting - The sort fields in order.
         * @returns {void}
         */
        setSorting(args, sorting) {
            const key = getAppModelDotName(args);
            const hasValue = Array.isArray(sorting) && sorting.length > 0;
            this._updatePreference(key, "sorting", hasValue ? sorting : undefined);
        },

        /**
         * Saves the rows per page for one app and model. A value that is not a number or string
         * removes the saved value.
         *
         * @param {ListPreferenceArgs} args - The app and model the preference belongs to.
         * @param {number | string} perPage - The row count, or `"all"` for all rows.
         * @returns {void}
         */
        setPerPage(args, perPage) {
            const key = getAppModelDotName(args);
            const hasValue = typeof perPage === "number" || typeof perPage === "string";
            this._updatePreference(key, "perPage", hasValue ? perPage : undefined);
        },

        /**
         * Removes every saved preference for one app and model and writes the change to
         * localStorage.
         *
         * @param {ListPreferenceArgs} args - The app and model to clear.
         * @returns {void}
         */
        clearPreferences(args) {
            const key = getAppModelDotName(args);
            if (!(key in this.preferences)) {
                return;
            }

            const next = { ...this.preferences };
            delete next[key];
            this.preferences = next;
            saveToLocalStorage(this.preferences);
        },

        /**
         * Removes the saved hidden columns for one app and model.
         *
         * @param {ListPreferenceArgs} args - The app and model to clear.
         * @returns {void}
         */
        clearHiddenColumns(args) {
            this.setHiddenColumns(args, []);
        },

        /**
         * Removes the saved filters for one app and model.
         *
         * @param {ListPreferenceArgs} args - The app and model to clear.
         * @returns {void}
         */
        clearFilters(args) {
            this.setFilters(args, {});
        },

        /**
         * Removes the saved sorting for one app and model.
         *
         * @param {ListPreferenceArgs} args - The app and model to clear.
         * @returns {void}
         */
        clearSorting(args) {
            this.setSorting(args, []);
        },

        /**
         * Removes the saved rows per page for one app and model.
         *
         * @param {ListPreferenceArgs} args - The app and model to clear.
         * @returns {void}
         */
        clearPerPage(args) {
            const key = getAppModelDotName(args);
            this._updatePreference(key, "perPage", undefined);
        },

        /**
         * Sets or removes one field of a saved entry and writes the change to localStorage. Does
         * nothing when the value is unchanged. Removes the entry when its last field is removed.
         *
         * @param {string} key - The app and model dot name from `getAppModelDotName`.
         * @param {keyof ListPreferenceEntry} preferenceKey - The entry field to change.
         * @param {*} value - The new field value, or `undefined` to remove the field.
         * @returns {void}
         * @private
         */
        _updatePreference(key, preferenceKey, value) {
            const currentPrefs = this.preferences[key] || {};
            const currentValue = currentPrefs[preferenceKey];
            if (isEqual(currentValue, value)) {
                return;
            }

            const nextPrefs = { ...currentPrefs };

            if (value === undefined) {
                delete nextPrefs[preferenceKey];
            } else {
                nextPrefs[preferenceKey] = value;
            }

            const next = { ...this.preferences };

            if (Object.keys(nextPrefs).length > 0) {
                next[key] = nextPrefs;
            } else {
                delete next[key];
            }

            this.preferences = next;
            saveToLocalStorage(this.preferences);
        },
    },
});
