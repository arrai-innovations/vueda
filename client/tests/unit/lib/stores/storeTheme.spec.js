import { scopedIt } from "@tests/unit/utils.js";
import { storeTheme } from "@vueda/stores/storeTheme.js";
import { createPinia, setActivePinia } from "pinia";

describe("lib/stores/storeTheme.js", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    scopedIt("registers components and variants", () => {
        const store = storeTheme();
        store.registerComponent("Button", { defaultVariant: "primary", spots: ["base", "icon"] });
        store.registerVariant("Button", "primary", { base: "btn-base", icon: "btn-icon" });

        expect(store.components.Button.defaultVariant).toBe("primary");
        expect(store.variants.Button.primary.base).toBe("btn-base");
    });

    scopedIt("clears a component and its variants", () => {
        const store = storeTheme();
        store.registerComponent("Button", { defaultVariant: "primary", spots: ["base"] });
        store.registerVariant("Button", "primary", { base: "btn" });

        store.clearComponent("Button");

        expect(store.components.Button).toBeUndefined();
        expect(store.variants.Button).toBeUndefined();
    });

    scopedIt("clears a single variant", () => {
        const store = storeTheme();
        store.registerComponent("Button", { defaultVariant: "primary", spots: ["base"] });
        store.registerVariant("Button", "primary", { base: "btn" });
        store.registerVariant("Button", "secondary", { base: "btn-secondary" });

        store.clearVariant("Button", "secondary");

        expect(store.variants.Button.secondary).toBeUndefined();
        expect(store.variants.Button.primary).toBeDefined();
    });

    scopedIt("clears all components and variants", () => {
        const store = storeTheme();
        store.registerComponent("Button", { defaultVariant: "primary", spots: ["base"] });
        store.registerVariant("Button", "primary", { base: "btn" });
        store.registerComponent("Input", { defaultVariant: "base", spots: ["base"] });
        store.registerVariant("Input", "base", { base: "input" });

        store.clearAll();

        expect(Object.keys(store.components)).toHaveLength(0);
        expect(Object.keys(store.variants)).toHaveLength(0);
    });
});
