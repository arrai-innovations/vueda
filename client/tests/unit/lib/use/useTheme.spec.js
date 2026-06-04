import { scopedIt } from "@tests/unit/utils.js";
import { getTheme, mergeTheme, patchTheme, setTheme, useTheme, useThemeOverride } from "@vueda/use/useTheme.js";
import { nextTick, reactive, ref } from "vue";

const flush = async () => {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        await nextTick();
    }
};

describe("lib/use/useTheme.js", () => {
    afterEach(() => {
        setTheme({});
    });

    scopedIt("mergeTheme combines class strings", () => {
        const t1 = { Foo: { base: { class: "a" } } };
        const t2 = { Foo: { base: { class: "b" } } };
        const merged = mergeTheme(t1, t2);
        expect(merged.Foo.base.class).toBe("a b");
    });

    scopedIt("mergeTheme merges class functions", () => {
        const t1 = { Foo: { base: { class: () => "a" } } };
        const t2 = { Foo: { base: { class: (ctx) => ctx.bar } } };
        const merged = mergeTheme(t1, t2);
        expect(merged.Foo.base.class({ bar: "b" })).toBe("a b");
    });

    scopedIt("setTheme, getTheme and patchTheme work together", () => {
        setTheme({ Foo: { base: { class: "a" } } });
        patchTheme({ Foo: { extra: { class: "b" } } });
        const theme = getTheme();
        expect(theme.Foo.base.class).toBe("a");
        expect(theme.Foo.extra.class).toBe("b");
        theme.Foo.base.class = "changed";
        expect(getTheme().Foo.base.class).toBe("a");
    });

    scopedIt("useTheme returns combined classes with overrides", () => {
        setTheme({ Button: { base: { class: "default" } } });
        const props = reactive({
            themeOverride: { Button: { base: { class: "override" } } },
        });
        const fn = useTheme("Button", props);
        expect(fn("base")).toBe("default override");
        expect(fn.componentName).toBe("Button");
        expect(fn.es).toBeDefined();
    });

    scopedIt("useTheme returns empty string when no theme is set", () => {
        const fn = useTheme("Missing", reactive({ themeOverride: {} }));
        expect(fn("anyKey")).toBe("");
    });

    scopedIt("useTheme throws on missing component name", () => {
        expect(() => useTheme("", reactive({ themeOverride: {} }))).toThrow("No component name passed");
    });

    scopedIt("useThemeOverride merges overrides", () => {
        const local = ref({ Foo: { base: { class: "local" } } });
        const config = ref({ Foo: { base: { class: "config" } } });
        const merged = useThemeOverride(local, config);
        expect(merged.value.Foo.base.class).toBe("config local");
        local.value.Foo.base.class = "new";
        expect(merged.value.Foo.base.class).toBe("config new");
    });

    scopedIt("useTheme resolves composes references and prepends them", () => {
        setTheme({
            _ButtonBase: { root: { class: "base" } },
            Button: { root: { composes: ["_ButtonBase.root"], class: "own" } },
        });
        const fn = useTheme("Button", reactive({ themeOverride: {} }));
        expect(fn("root")).toBe("base own");
    });

    scopedIt("useTheme propagates overrides through composes via useThemeOverride", () => {
        setTheme({
            _ButtonBase: { root: { class: "base" } },
            Button: { root: { composes: ["_ButtonBase.root"], class: "own" } },
        });
        const props = reactive({
            themeOverride: { _ButtonBase: { root: { class: "override-base" } } },
        });
        const fn = useTheme("Button", props);
        expect(fn("root")).toBe("base override-base own");
    });

    scopedIt("useTheme composes from function-form slots and propagates context", () => {
        setTheme({
            _ButtonGhost: { root: { class: "ghost" } },
            _ButtonDefault: { root: { class: "default" } },
            Button: {
                root: ({ variant }) => ({
                    composes: [variant === "ghost" ? "_ButtonGhost.root" : "_ButtonDefault.root"],
                    class: "own",
                }),
            },
        });
        const props = reactive({ themeOverride: {} });
        const fn = useTheme("Button", props, { variant: "ghost" });
        expect(fn("root")).toBe("ghost own");
        const fn2 = useTheme("Button", props, { variant: "default" });
        expect(fn2("root")).toBe("default own");
    });

    scopedIt("useTheme composes is replace, not concat, on override", () => {
        setTheme({
            _ButtonDefault: { root: { class: "default" } },
            _ButtonGhost: { root: { class: "ghost" } },
            Button: { root: { composes: ["_ButtonDefault.root"], class: "own" } },
        });
        const props = reactive({
            // Replace the compose list entirely with the ghost meta key.
            themeOverride: { Button: { root: { composes: ["_ButtonGhost.root"] } } },
        });
        const fn = useTheme("Button", props);
        expect(fn("root")).toBe("ghost own");
    });

    scopedIt("useTheme detects composition cycles", () => {
        setTheme({
            _A: { root: { composes: ["_B.root"], class: "a" } },
            _B: { root: { composes: ["_A.root"], class: "b" } },
        });
        const fn = useTheme("_A", reactive({ themeOverride: {} }));
        expect(() => fn("root")).toThrow(/composition cycle detected/);
    });

    scopedIt("useTheme rejects malformed composes references", () => {
        setTheme({
            Button: { root: { composes: ["_NoSlotSpecified"], class: "own" } },
        });
        const fn = useTheme("Button", reactive({ themeOverride: {} }));
        expect(() => fn("root")).toThrow(/invalid composes reference/);
    });

    scopedIt("useTheme.loading is undefined when no loader is involved (sync path)", () => {
        // reactive-helpers convention: undefined = never loaded (no loading
        // activity ever happened on this instance). Reading a slot on the sync
        // path doesn't flip it.
        setTheme({ Button: { root: { class: "own" } } });
        const fn = useTheme("Button", reactive({ themeOverride: {} }));
        expect(fn.loading.value).toBeUndefined();
        fn("root");
        expect(fn.loading.value).toBeUndefined();
    });

    scopedIt("useTheme.loading flips true on useTheme() call when entry is a loader", async () => {
        // Loader form: a function that fires patchTheme on resolution.
        const loader = () =>
            Promise.resolve().then(() => {
                patchTheme({ Button: { root: { class: "loaded" } } });
            });
        patchTheme({ Button: loader });

        const fn = useTheme("Button", reactive({ themeOverride: {} }));
        // Loading should be true immediately — before any slot is read.
        expect(fn.loading.value).toBe(true);
        // Slot read at this moment returns empty (still pending).
        expect(fn("root")).toBe("");

        await flush();

        // After the loader settles and patchTheme registers real data, the
        // outer computed re-runs the sync path and returns the real classes.
        // Loading is now `false` (loaded at least once), not undefined.
        expect(fn.loading.value).toBe(false);
        expect(fn("root")).toBe("loaded");
    });

    scopedIt("useTheme.hideStyle hides while loading, clears when settled", async () => {
        const loader = () =>
            Promise.resolve().then(() => {
                patchTheme({ Button: { root: { class: "loaded" } } });
            });
        patchTheme({ Button: loader });

        const fn = useTheme("Button", reactive({ themeOverride: {} }));
        expect(fn.hideStyle.value).toBe("display: none !important");
        await flush();
        expect(fn.hideStyle.value).toBe("");
    });

    scopedIt("useTheme.hideStyle is empty when no loader is involved", () => {
        setTheme({ Button: { root: { class: "own" } } });
        const fn = useTheme("Button", reactive({ themeOverride: {} }));
        // loading is `undefined` (never loaded), so hideStyle is "".
        expect(fn.hideStyle.value).toBe("");
    });
});
