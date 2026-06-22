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
        // Live sorted shape: an array of field names, leading "-" means descending.
        const sorting = ["-updated", "mrr"];
        const setItemSpy = vi.spyOn(storagePrototype, "setItem");
        setItemSpy.mockClear();

        store.setSorting(args, sorting);

        expect(store.preferences[preferenceKey].sorting).toEqual(sorting);
        const restored = store.getSorting(args);
        expect(Array.isArray(restored)).toBe(true);
        expect(restored).toEqual(sorting);
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockClear();
        store.setSorting(args, []);

        expect(store.preferences[preferenceKey]).toBeUndefined();
        expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(store.preferences));

        setItemSpy.mockRestore();
    });

    scopedIt("returns a fresh array copy when reading sorting preferences", () => {
        store.setSorting(args, ["-updated", "mrr"]);

        const restored = store.getSorting(args);
        restored.push("status");

        expect(store.getSorting(args)).toEqual(["-updated", "mrr"]);
    });

    scopedIt("survives a read-then-write restore cycle without dropping the value", () => {
        // Mirrors useViewList restore: getSorting() feeds straight back into
        // setSorting(). A non-array return here would fail setSorting's
        // Array.isArray guard and silently clear the stored preference.
        store.setSorting(args, ["-updated", "mrr"]);

        const restored = store.getSorting(args);
        store.setSorting(args, restored);

        expect(store.getSorting(args)).toEqual(["-updated", "mrr"]);
    });

    scopedIt("restores sorting into a fresh store after a page reload", () => {
        store.setSorting(args, ["-updated", "mrr"]);

        setActivePinia(createPinia());
        const reloadedStore = storeListPreference();
        expect(reloadedStore.getSorting(args)).toBeNull();

        reloadedStore.init();

        expect(reloadedStore.getSorting(args)).toEqual(["-updated", "mrr"]);
    });

    scopedIt("persists a numeric rows-per-page preference and clears it", () => {
        store.setPerPage(args, 50);
        expect(store.preferences[preferenceKey].perPage).toBe(50);
        expect(store.getPerPage(args)).toBe(50);

        store.clearPerPage(args);
        expect(store.getPerPage(args)).toBeNull();
        expect(store.preferences[preferenceKey]).toBeUndefined();
    });

    scopedIt("persists the all-pages sentinel as rows-per-page", () => {
        store.setPerPage(args, "all");
        expect(store.getPerPage(args)).toBe("all");
    });

    scopedIt("returns null for rows-per-page when nothing is stored", () => {
        expect(store.getPerPage(args)).toBeNull();
    });

    scopedIt("restores rows-per-page into a fresh store after a page reload", () => {
        store.setPerPage(args, 100);

        setActivePinia(createPinia());
        const reloadedStore = storeListPreference();
        expect(reloadedStore.getPerPage(args)).toBeNull();

        reloadedStore.init();

        expect(reloadedStore.getPerPage(args)).toBe(100);
    });

    scopedIt("clears specific preference groups and removes the stored entry", () => {
        const setItemSpy = vi.spyOn(storagePrototype, "setItem");
        setItemSpy.mockClear();

        store.setHiddenColumns(args, ["name"]);
        store.setFilters(args, { foo: "bar" });
        store.setSorting(args, ["-updated"]);

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
