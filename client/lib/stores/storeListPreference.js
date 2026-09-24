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
 * @typedef {import('pinia').Store<
 *   'listPreference',
 *   ListPreferenceState,
 *   {
 *     getPreferences: (state: ListPreferenceState) =>
 *       (args: ListPreferenceArgs) => ListPreferenceEntry | {},
 *     getHiddenColumns: (state: ListPreferenceState) =>
 *       (args: ListPreferenceArgs) => string[],
 *     getFilters: (state: ListPreferenceState) =>
 *       (args: ListPreferenceArgs) => Record<string, unknown>,
 *     getSorting: (state: ListPreferenceState) =>
 *       (args: ListPreferenceArgs) => string[] | null,
 *     getPerPage: (state: ListPreferenceState) =>
 *       (args: ListPreferenceArgs) => number | string | null,
 *   },
 *   {
 *     init: () => void,
 *     setHiddenColumns: (args: ListPreferenceArgs, hiddenColumns: string[]) => void,
 *     setFilters: (args: ListPreferenceArgs, filters: Record<string, unknown>) => void,
 *     setSorting: (args: ListPreferenceArgs, sorting: string[]) => void,
 *     setPerPage: (args: ListPreferenceArgs, perPage: number | string) => void,
 *     clearPreferences: (args: ListPreferenceArgs) => void,
 *     clearHiddenColumns: (args: ListPreferenceArgs) => void,
 *     clearFilters: (args: ListPreferenceArgs) => void,
 *     clearSorting: (args: ListPreferenceArgs) => void,
 *     clearPerPage: (args: ListPreferenceArgs) => void,
 *   }
 * >} ListPreferenceStore
 */

/** @type {ListPreferenceStore} */
export const storeListPreference = defineStore("listPreference", {
    state: () => ({
        initialized: false,
        preferences: {},
    }),
    getters: {
        getPreferences: (state) => (args) => {
            const key = getAppModelDotName(args);
            return state.preferences[key] ? { ...state.preferences[key] } : {};
        },

        getHiddenColumns: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            const hidden = prefs?.hiddenColumns;

            return Array.isArray(hidden) ? [...hidden] : [];
        },

        getFilters: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            return prefs?.filters ? { ...prefs.filters } : {};
        },

        getSorting: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            return Array.isArray(prefs?.sorting) ? [...prefs.sorting] : null;
        },

        getPerPage: (state) => (args) => {
            const key = getAppModelDotName(args);
            const prefs = state.preferences[key];
            const perPage = prefs?.perPage;
            return typeof perPage === "number" || typeof perPage === "string" ? perPage : null;
        },
    },
    actions: {
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
        setHiddenColumns(args, hiddenColumns) {
            const key = getAppModelDotName(args);
            const hasValue = Array.isArray(hiddenColumns) && hiddenColumns.length > 0;
            this._updatePreference(key, "hiddenColumns", hasValue ? hiddenColumns : undefined);
        },

        setFilters(args, filters) {
            console.log("filters", filters);
            const key = getAppModelDotName(args);
            const hasValue = filters && Object.keys(filters).length > 0;
            this._updatePreference(key, "filters", hasValue ? filters : undefined);
        },

        setSorting(args, sorting) {
            const key = getAppModelDotName(args);
            const hasValue = Array.isArray(sorting) && sorting.length > 0;
            this._updatePreference(key, "sorting", hasValue ? sorting : undefined);
        },

        setPerPage(args, perPage) {
            const key = getAppModelDotName(args);
            const hasValue = typeof perPage === "number" || typeof perPage === "string";
            this._updatePreference(key, "perPage", hasValue ? perPage : undefined);
        },

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

        clearHiddenColumns(args) {
            this.setHiddenColumns(args, []);
        },

        clearFilters(args) {
            this.setFilters(args, {});
        },

        clearSorting(args) {
            this.setSorting(args, []);
        },

        clearPerPage(args) {
            const key = getAppModelDotName(args);
            this._updatePreference(key, "perPage", undefined);
        },

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
