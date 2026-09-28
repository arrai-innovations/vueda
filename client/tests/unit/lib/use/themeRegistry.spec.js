import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { scopedIt } from "@tests/unit/utils.js";
import { combineThemeClasses, getTheme, patchTheme, setClassMerger, setTheme } from "@vueda/use/themeRegistry.js";
import { useTheme, useThemeOverride } from "@vueda/use/useTheme.js";
import { normalizeClass, reactive, ref } from "vue";

describe("lib/use/themeRegistry.js", () => {
    beforeEach(() => {
        setClassMerger(null);
        setTheme({});
    });
    afterEach(() => setClassMerger(null));

    scopedIt("keeps existing string, object, and reactive class results without a merger", () => {
        const enabled = ref(true);
        for (const layers of [
            ["bg-secondary", "bg-amber-500"],
            ["w-full text-heading", { "w-full": false, "text-foreground": enabled }],
            [["base", ["nested", { conditional: enabled }]], "extra"],
        ]) {
            expect(combineThemeClasses(...layers)).toEqual(combineClasses(...layers));
        }
        const theme = useTheme("Probe", reactive({}));
        setTheme({ Probe: { root: { class: "bg-secondary bg-amber-500" } } });
        expect(theme("root")).toBe("bg-secondary bg-amber-500");
    });

    scopedIt("passes active classes to the hook and retains false keys for later layers", () => {
        const merger = vi.fn(() => "merged");
        setClassMerger(merger);
        const result = combineThemeClasses("old keep", { old: false, new: true });
        expect(merger).toHaveBeenCalledWith("keep new");
        expect(result).toEqual({ old: false, merged: true });
        expect(normalizeClass(combineClasses("old", result))).toBe("merged");
    });

    scopedIt("passes repeated classes in layer order when an override reintroduces one", () => {
        const merger = vi.fn((classes) => classes);
        setClassMerger(merger);
        combineThemeClasses({ "bg-primary": true, "bg-secondary": true }, "bg-primary");
        expect(merger).toHaveBeenCalledWith("bg-primary bg-secondary bg-primary");
    });

    scopedIt("invalidates resolved slots when the merger is installed, replaced, or cleared", () => {
        setTheme({ Probe: { root: { class: "original" } } });
        const theme = useTheme("Probe", reactive({}));
        expect(theme("root")).toBe("original");
        setClassMerger(() => "first");
        expect(theme("root")).toBe("first");
        setClassMerger(() => "second");
        expect(theme("root")).toBe("second");
        setClassMerger(null);
        expect(theme("root")).toBe("original");
    });

    scopedIt("uses the hook when patching static and function-valued classes", () => {
        const merger = vi.fn((classes) => classes.replace("old new", "new"));
        setTheme({ Probe: { static: { class: "old" }, dynamic: { class: () => "old" } } });
        setClassMerger(merger);
        patchTheme({ Probe: { static: { class: "new" }, dynamic: { class: ({ value }) => value } } });
        expect(getTheme().Probe.static.class).toBe("new");
        expect(getTheme().Probe.dynamic.class({ value: "new" })).toBe("new");
    });

    scopedIt("preserves removals through override merging until composed defaults resolve", () => {
        setClassMerger((classes) => classes);
        setTheme({
            _Base: { root: { class: "w-full text-heading" } },
            Probe: { root: { composes: ["_Base.root"], class: "text-foreground" } },
        });
        const override = useThemeOverride({ Probe: { root: { class: { "w-full": false } } } });
        const theme = useTheme("Probe", reactive({ themeOverride: override }));
        expect(normalizeClass(theme("root"))).toBe("text-heading text-foreground");
    });
});
