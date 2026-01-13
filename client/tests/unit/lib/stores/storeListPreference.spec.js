import { scopedIt } from "@tests/unit/utils.js";
import { storeListPreference } from "@vueda/stores/storeListPreference.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

const STORAGE_KEY = "listPreference";
const storagePrototype = Object.getPrototypeOf(window.localStorage);

/** @typedef {{ app: string, model: string }} PreferenceArgs */

describe("lib/stores/storeListPreference.js", () => {
    /** @type {PreferenceArgs} */
    const args = { app: "app", model: "model" };
    const preferenceKey = getAppModelDotName(args);
    let store;

    beforeEach(() => {
        setActivePinia(createPinia());
        window.localStorage.clear();
        store = storeListPreference();
    });

    scopedIt("initializes preferences from localStorage only once", () => {
        const saved = { [preferenceKey]: { filters: { foo: "bar" } } };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        const getItemSpy = vi.spyOn(storagePrototype, "getItem");

        store.init();

        expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEY);
        expect(store.preferences).toEqual(saved);
        expect(store.initialized).toBe(true);

        getItemSpy.mockClear();
        store.init();
        expect(getItemSpy).not.toHaveBeenCalled();

        getItemSpy.mockRestore();
    });

    scopedIt("stores hidden column selections and clears them when empty", () => {
        const setItemSpy = vi.spyOn(storagePrototype, "setItem");
        setItemSpy.mockClear();

        store.setHiddenColumns(args, ["name"]);

        expect(store.preferences[preferenceKey].hiddenColumns).toEqual(["name"]);
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockClear();
        store.setHiddenColumns(args, []);

        expect(store.preferences[preferenceKey]).toBeUndefined();
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockRestore();
    });

    scopedIt("returns a copy of hidden columns when reading preferences", () => {
        store.setHiddenColumns(args, ["name"]);

        const hidden = store.getHiddenColumns(args);
        hidden.push("other");

        expect(store.getHiddenColumns(args)).toEqual(["name"]);
    });

    scopedIt("stores filters only when provided and clears them", () => {
        const setItemSpy = vi.spyOn(storagePrototype, "setItem");
        setItemSpy.mockClear();

        store.setFilters(args, { foo: "bar" });

        expect(store.preferences[preferenceKey].filters).toEqual({ foo: "bar" });
        expect(store.getFilters(args)).toEqual({ foo: "bar" });
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockClear();
        store.setFilters(args, {});

        expect(store.preferences[preferenceKey]).toBeUndefined();
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockRestore();
    });

    scopedIt("persists sorting preferences and supports clearing them", () => {
        const sorting = [{ field: "name", direction: "asc" }];
        const setItemSpy = vi.spyOn(storagePrototype, "setItem");
        setItemSpy.mockClear();

        store.setSorting(args, sorting);

        expect(store.preferences[preferenceKey].sorting).toEqual(sorting);
        expect(store.getSorting(args)).toEqual({ 0: sorting[0] });
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockClear();
        store.setSorting(args, []);

        expect(store.preferences[preferenceKey]).toBeUndefined();
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockRestore();
    });

    scopedIt("clears specific preference groups and removes the stored entry", () => {
        const setItemSpy = vi.spyOn(storagePrototype, "setItem");
        setItemSpy.mockClear();

        store.setHiddenColumns(args, ["name"]);
        store.setFilters(args, { foo: "bar" });
        store.setSorting(args, [{ field: "name", direction: "asc" }]);

        expect(store.preferences[preferenceKey]).toBeDefined();

        store.clearHiddenColumns(args);
        expect(store.preferences[preferenceKey].hiddenColumns).toBeUndefined();

        store.clearFilters(args);
        expect(store.preferences[preferenceKey].filters).toBeUndefined();

        store.clearSorting(args);
        expect(store.preferences[preferenceKey]).toBeUndefined();

        store.setFilters(args, { foo: "bar" });
        expect(store.preferences[preferenceKey]).toBeDefined();

        store.clearPreferences(args);
        expect(store.preferences[preferenceKey]).toBeUndefined();

        expect(setItemSpy).toHaveBeenCalled();
        setItemSpy.mockRestore();
    });
});
