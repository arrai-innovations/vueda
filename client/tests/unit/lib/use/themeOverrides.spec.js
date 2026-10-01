import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { flushPromises } from "@vue/test-utils";
import {
    clearThemeOverrides,
    getTheme,
    overrideTheme,
    patchTheme,
    setTheme,
    useTheme,
    useThemeOverride,
} from "@vueda/use/useTheme.js";
import { defineComponent, h, nextTick, normalizeClass, reactive } from "vue";

const resolve = (name = "Button", props = reactive({}), context) => useTheme(name, props, context);

describe("lib/use/useTheme.js", () => {
    afterEach(() => {
        clearThemeOverrides();
        setTheme({});
    });

    describe("Project overrides", () => {
        scopedIt("preserves overrides across default registration and base replacement", () => {
            overrideTheme({ Button: { root: { class: "project" } } });
            const theme = resolve();
            expect(theme("root")).toBe("project");
            patchTheme({ Button: { root: { class: "default" } } });
            expect(theme("root")).toBe("default project");
            setTheme({ Button: { root: { class: "replacement" } } });
            expect(theme("root")).toBe("replacement project");
            setTheme({});
            expect(theme("root")).toBe("project");
        });

        scopedIt("keeps base snapshots independent of project data and later caller mutations", () => {
            setTheme({ Button: { root: { class: "default" } } });
            const project = {
                Button: { root: { class: "project", composes: ["_Project.root"] } },
                _Project: { root: { class: "primitive" } },
            };
            overrideTheme(project);
            project.Button.root.class = "mutated";
            project.Button.root.composes.push("_Missing.root");
            expect(getTheme()).toEqual({ Button: { root: { class: "default" } } });
            expect(resolve()("root")).toBe("primitive default project");
        });

        scopedIt("merges project calls in order and replaces compose lists including empty lists", () => {
            setTheme({
                Button: { root: { class: "base", composes: ["_Base.root"] } },
                _Base: { root: { class: "base-primitive" } },
            });
            overrideTheme({
                Button: { root: { class: "first", composes: ["_Project.root"] } },
                _Project: { root: { class: "project-primitive" } },
            });
            const theme = resolve();
            expect(theme("root")).toBe("project-primitive base first");
            overrideTheme({ Button: { root: { class: "second", composes: [] } } });
            expect(theme("root")).toBe("base first second");
            clearThemeOverrides();
            expect(theme("root")).toBe("base-primitive base");
        });

        scopedIt("keeps project primitive classes before the consuming slot's own classes", () => {
            setTheme({
                _Base: { root: { class: "base-primitive" } },
                Button: { root: { composes: ["_Base.root"], class: "base-own" } },
            });
            overrideTheme({
                _Base: { root: { class: "project-primitive" } },
                Button: { root: { class: "project-own" } },
            });
            expect(resolve()("root")).toBe("base-primitive project-primitive base-own project-own");
        });

        scopedIt("evaluates slot and class functions with context and preserves composed class removals", () => {
            const context = reactive({ compact: false });
            setTheme({
                _Base: { root: { class: "remove keep" } },
                Button: { root: ({ compact }) => ({ composes: ["_Base.root"], class: compact ? "small" : "large" }) },
            });
            overrideTheme({
                Button: { root: { class: ({ compact }) => ({ remove: false, compact, project: true }) } },
            });
            overrideTheme({ Button: { root: ({ compact }) => ({ class: compact ? "dense" : "roomy" }) } });
            const theme = resolve("Button", reactive({}), context);
            expect(normalizeClass(theme("root"))).toBe("keep large project roomy");
            context.compact = true;
            expect(normalizeClass(theme("root"))).toBe("keep small compact project dense");
        });

        scopedIt("caches resolved slots between changes", () => {
            const slot = vi.fn(() => ({ class: "project" }));
            overrideTheme({ Button: { root: slot } });
            const theme = resolve();
            expect(theme("root")).toBe("project");
            expect(theme("root")).toBe("project");
            expect(slot).toHaveBeenCalledTimes(1);
            patchTheme({ Button: { root: { class: "base" } } });
            expect(theme("root")).toBe("base project");
            expect(slot).toHaveBeenCalledTimes(2);
        });

        scopedIt("updates mounted consumers when overrides, defaults, or the base change", async () => {
            const Component = defineComponent({
                setup() {
                    const theme = resolve();
                    return () => h("button", { class: theme("root") });
                },
            });
            const wrapper = mount(Component);
            try {
                overrideTheme({ Button: { root: { class: "project" } } });
                await nextTick();
                expect(wrapper.classes()).toEqual(["project"]);
                patchTheme({ Button: { root: { class: "base" } } });
                await nextTick();
                expect(wrapper.classes()).toEqual(["base", "project"]);
                setTheme({ Button: { root: { class: "replacement" } } });
                await nextTick();
                expect(wrapper.classes()).toEqual(["replacement", "project"]);
                clearThemeOverrides();
                await nextTick();
                expect(wrapper.classes()).toEqual(["replacement"]);
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("preserves component-config, ancestor, and local precedence above project overrides", async () => {
            const local = reactive({
                themeOverride: { Button: { root: { class: "local", composes: ["_Local.root"] } } },
            });
            setTheme({
                Button: {
                    root: { class: "base", composes: ["_Base.root"] },
                    themeOverride: { Button: { root: { class: "config", composes: ["_Config.root"] } } },
                },
                _Local: { root: { class: "local-primitive" } },
            });
            overrideTheme({ Button: { root: { class: "project", composes: ["_Project.root"] } } });
            const Child = defineComponent({
                setup() {
                    const theme = resolve("Button", local);
                    return () => h("button", { class: theme("root") });
                },
            });
            const Parent = defineComponent({
                setup() {
                    useThemeOverride({ Button: { root: { class: "ancestor", composes: [] } } });
                    return () => h(Child);
                },
            });
            const wrapper = mount(Parent);
            try {
                expect(wrapper.classes()).toEqual([
                    "local-primitive",
                    "base",
                    "project",
                    "config",
                    "ancestor",
                    "local",
                ]);
                local.themeOverride = {};
                await nextTick();
                expect(wrapper.classes()).toEqual(["base", "project", "config", "ancestor"]);
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("updates embedded project themeOverride configuration for descendants", async () => {
            setTheme({
                Parent: { themeOverride: { Button: { root: { class: "base-config" } } } },
                Button: { root: { class: "base" } },
            });
            const Child = defineComponent({
                setup() {
                    const theme = resolve();
                    return () => h("button", { class: theme("root") });
                },
            });
            const Parent = defineComponent({
                setup() {
                    resolve("Parent");
                    return () => h(Child);
                },
            });
            const wrapper = mount(Parent);
            try {
                expect(wrapper.classes()).toEqual(["base", "base-config"]);
                overrideTheme({ Parent: { themeOverride: { Button: { root: { class: "project-config" } } } } });
                await nextTick();
                expect(wrapper.classes()).toEqual(["base", "base-config", "project-config"]);
                clearThemeOverrides();
                await nextTick();
                expect(wrapper.classes()).toEqual(["base", "base-config"]);
            } finally {
                wrapper.unmount();
            }
        });
    });

    describe("Asynchronous defaults", () => {
        scopedIt.each([true, false])(
            "retains a base loader when the project registers first: %s",
            async (projectFirst) => {
                let complete;
                const pending = new Promise((resolve) => {
                    complete = resolve;
                });
                const loader = vi.fn(async () => {
                    await pending;
                    patchTheme({ Button: { root: { class: "loaded", composes: ["_Default.root"] } } });
                });
                const project = { Button: { root: { class: "project", composes: [] } } };
                if (projectFirst) {
                    overrideTheme(project);
                }
                patchTheme({ Button: loader });
                if (!projectFirst) {
                    overrideTheme(project);
                }
                expect(getTheme().Button).toBe(loader);
                const theme = resolve();
                expect(theme.loading.value).toBe(true);
                expect(theme.hideStyle.value).toBe("display: none !important");
                expect(theme("root")).toBe("");
                overrideTheme({ Button: { root: { class: "latest" } } });
                complete();
                await flushPromises();
                expect(loader).toHaveBeenCalledTimes(1);
                expect(theme("root")).toBe("loaded project latest");
                expect(theme.loading.value).toBe(false);
                expect(theme.hideStyle.value).toBe("");
            },
        );

        scopedIt("applies overrides through a composed loader and keeps removals until resolution", async () => {
            let complete;
            const pending = new Promise((resolve) => {
                complete = resolve;
            });
            setTheme({
                Button: { root: { class: "own", composes: ["_Async.root"] } },
                _Async: async () => {
                    await pending;
                    patchTheme({ _Async: { root: { class: "remove loaded" } } });
                },
            });
            overrideTheme({
                _Async: { root: { class: "primitive-project" } },
                Button: { root: { class: { remove: false, project: true } } },
            });
            const theme = resolve();
            expect(theme("root")).toBe("");
            await nextTick();
            expect(theme.loading.value).toBe(true);
            complete();
            await flushPromises();
            expect(normalizeClass(theme("root"))).toBe("loaded primitive-project own project");
            expect(theme.loading.value).toBe(false);
        });

        scopedIt("clears overrides while a loader is pending", async () => {
            let complete;
            const pending = new Promise((resolve) => {
                complete = resolve;
            });
            setTheme({
                Button: async () => {
                    await pending;
                    patchTheme({ Button: { root: { class: "loaded" } } });
                },
            });
            overrideTheme({ Button: { root: { class: "project" } } });
            const theme = resolve();
            clearThemeOverrides();
            complete();
            await flushPromises();
            expect(theme("root")).toBe("loaded");
        });
    });
});
