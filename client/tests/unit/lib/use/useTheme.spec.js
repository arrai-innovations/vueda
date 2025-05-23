import { scopedIt } from "@tests/unit/utils.js";

describe("lib/use/useTheme.js", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.resetModules();
    });

    scopedIt("mergeTheme combines class strings", async () => {
        const { mergeTheme } = await import("@vueda/use/useTheme.js");
        const t1 = { Foo: { base: { class: "a" } } };
        const t2 = { Foo: { base: { class: "b" } } };
        const merged = mergeTheme(t1, t2);
        expect(merged.Foo.base.class).toBe("a b");
    });

    scopedIt("mergeTheme merges class functions", async () => {
        const { mergeTheme } = await import("@vueda/use/useTheme.js");
        const t1 = { Foo: { base: { class: () => "a" } } };
        const t2 = { Foo: { base: { class: (ctx) => ctx.bar } } };
        const merged = mergeTheme(t1, t2);
        expect(merged.Foo.base.class({ bar: "b" })).toBe("a b");
    });

    scopedIt("setTheme, getTheme and patchTheme work together", async () => {
        vi.doMock("@vueda/theme/vueda-tailwind/index.js", () => ({ default: {} }));
        const mod = await import("@vueda/use/useTheme.js");
        mod.setTheme({ Foo: { base: { class: "a" } } });
        mod.patchTheme({ Foo: { extra: { class: "b" } } });
        const theme = mod.getTheme();
        expect(theme.Foo.base.class).toBe("a");
        expect(theme.Foo.extra.class).toBe("b");
        theme.Foo.base.class = "changed";
        expect(mod.getTheme().Foo.base.class).toBe("a");
    });

    scopedIt("useTheme returns combined classes with overrides", async () => {
        vi.doMock("@vueda/theme/vueda-tailwind/index.js", () => ({
            default: { Button: { base: { class: "default" } } },
        }));
        const { useTheme } = await import("@vueda/use/useTheme.js");
        const vue = await import("vue");
        const props = vue.reactive({
            themeOverride: { Button: { base: { class: "override" } } },
        });
        const fn = useTheme("Button", props);
        expect(fn("base")).toBe("default override");
        expect(fn.componentName).toBe("Button");
        expect(fn.es).toBeDefined();
    });

    scopedIt("useTheme throws on missing component or key", async () => {
        vi.doMock("@vueda/theme/vueda-tailwind/index.js", () => ({ default: {} }));
        const { useTheme } = await import("@vueda/use/useTheme.js");
        const vue = await import("vue");
        expect(() => useTheme("Missing", vue.reactive({ themeOverride: {} }))).toThrow(
            "No theme config found for Missing",
        );
        vi.resetModules();
        vi.doMock("@vueda/theme/vueda-tailwind/index.js", () => ({
            default: { Foo: { base: { class: "a" } } },
        }));
        const { useTheme: useTheme2 } = await import("@vueda/use/useTheme.js");
        const fn = useTheme2("Foo", vue.reactive({ themeOverride: {} }));
        expect(() => fn("nope")).toThrow("No theme config key found for nope in Foo");
    });

    scopedIt("useThemeOverride merges overrides", async () => {
        vi.doMock("@vueda/theme/vueda-tailwind/index.js", () => ({ default: {} }));
        const { useThemeOverride } = await import("@vueda/use/useTheme.js");
        const vue = await import("vue");
        const local = vue.ref({ Foo: { base: { class: "local" } } });
        const config = vue.ref({ Foo: { base: { class: "config" } } });
        const merged = useThemeOverride(local, config);
        expect(merged.value.Foo.base.class).toBe("config local");
        local.value.Foo.base.class = "new";
        expect(merged.value.Foo.base.class).toBe("config new");
    });
});
