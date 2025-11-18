import { scopedIt } from "@tests/unit/utils.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { createPinia, setActivePinia } from "pinia";

describe("lib/stores/storeCollapseNav.js", () => {
    let storeCollapseNav, useBreakpoints, breakpointsMock;
    beforeEach(async () => {
        setActivePinia(createPinia());
        vi.resetModules();
        breakpointsMock = { isGreaterOrEqual: vi.fn(() => true) };
        vi.doMock("@vueuse/core", () => ({ useBreakpoints: vi.fn(() => breakpointsMock) }));
        storeCollapseNav = (await import("@vueda/stores/storeCollapseNav.js")).storeCollapseNav;
        useBreakpoints = (await import("@vueuse/core")).useBreakpoints;
        localStorage.clear();
    });
    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        localStorage.clear();
    });

    scopedIt("init() uses localStorage when available", () => {
        localStorage.setItem("collapseNav", "true");
        const store = storeCollapseNav();
        store.init();
        expect(store.isCollapsed).toBe(true);
    });

    scopedIt("init() falls back to breakpoint", () => {
        const store = storeCollapseNav();
        store.init();
        expect(useBreakpoints).toHaveBeenCalledWith(breakpointsVueda);
        expect(breakpointsMock.isGreaterOrEqual).toHaveBeenCalledWith("lg");
        expect(store.isCollapsed).toBe(true);
    });

    scopedIt("toggle() flips state and persists", () => {
        const setItemSpy = vi.spyOn(Object.getPrototypeOf(window.localStorage), "setItem");
        const store = storeCollapseNav();
        expect(store.isCollapsed).toBe(false);
        store.toggle();
        expect(store.isCollapsed).toBe(true);
        expect(setItemSpy).toHaveBeenCalledWith("collapseNav", "true");
        store.toggle();
        expect(store.isCollapsed).toBe(false);
        expect(setItemSpy).toHaveBeenLastCalledWith("collapseNav", "false");
    });
});
