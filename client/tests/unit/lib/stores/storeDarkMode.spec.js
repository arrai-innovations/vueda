import { scopedIt } from "@tests/unit/utils.js";
import { createPinia, setActivePinia } from "pinia";

describe("lib/stores/storeDarkMode.js", () => {
    let storeDarkMode;
    beforeEach(async () => {
        setActivePinia(createPinia());
        vi.resetModules();
        storeDarkMode = (await import("@vueda/stores/storeDarkMode.js")).storeDarkMode;
        localStorage.clear();
    });
    afterEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        localStorage.clear();
    });

    scopedIt("init() uses localStorage when available", () => {
        localStorage.setItem("darkMode", "true");
        const store = storeDarkMode();
        store.init();
        expect(store.isDark).toBe(true);
    });

    scopedIt("init() falls back to media preference", () => {
        const matchMediaMock = vi
            .fn()
            .mockReturnValue({ matches: true, addListener: () => {}, removeListener: () => {} });
        window.matchMedia = matchMediaMock;
        const store = storeDarkMode();
        store.init();
        expect(matchMediaMock).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
        expect(store.isDark).toBe(true);
    });

    scopedIt("toggle() flips state and persists", () => {
        const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");
        const store = storeDarkMode();
        expect(store.isDark).toBe(false);
        store.toggle();
        expect(store.isDark).toBe(true);
        expect(setItemSpy).toHaveBeenCalledWith("darkMode", "true");
        store.toggle();
        expect(store.isDark).toBe(false);
        expect(setItemSpy).toHaveBeenLastCalledWith("darkMode", "false");
    });
});
