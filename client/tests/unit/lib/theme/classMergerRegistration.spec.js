import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import { normalizeClass, reactive } from "vue";

// Each case starts with fresh module evaluation, as an application does. This
// catches registration that accidentally works only after an aggregate import.
describe("lib/theme/vueda-tailwind/**/*.js", () => {
    beforeEach(() => vi.resetModules());

    for (const path of ["aggregate", "family", "component", "lazy"]) {
        scopedIt(`registers the merger through the ${path} loading path`, async () => {
            const { setTheme, patchTheme } = await import("@vueda/use/themeRegistry.js");
            const { useTheme } = await import("@vueda/use/useTheme.js");
            if (path === "aggregate") {
                const { default: theme } = await import("@vueda/theme/vueda-tailwind/index.js");
                setTheme(theme);
            } else if (path === "family") {
                await import("@vueda/theme/vueda-tailwind/controls/index.js");
            } else if (path === "component") {
                await import("@vueda/controls/button/Button.vue");
            } else {
                patchTheme({ Button: () => import("@vueda/theme/vueda-tailwind/controls/Button.theme.js") });
            }
            const theme = useTheme(
                "Button",
                reactive({
                    themeOverride: { Button: { root: { class: "bg-amber-500" } } },
                }),
                { tone: "neutral", emphasis: "fill" },
            );
            theme("root");
            await flushPromises();
            const classes = normalizeClass(theme("root")).split(" ");
            expect(classes).toContain("bg-amber-500");
            expect(classes).not.toContain("bg-secondary");
        });
    }

    scopedIt("applies the merger to the async fallback for a composed loader", async () => {
        const { patchTheme } = await import("@vueda/use/themeRegistry.js");
        const { useTheme } = await import("@vueda/use/useTheme.js");
        patchTheme({
            Button: () => import("@vueda/theme/vueda-tailwind/controls/Button.theme.js"),
            Probe: { root: { composes: ["Button.root"], class: "bg-amber-500" } },
        });
        const theme = useTheme("Probe", reactive({}), { tone: "neutral", emphasis: "fill" });
        expect(theme("root")).toBe("");
        await flushPromises();
        const classes = normalizeClass(theme("root")).split(" ");
        expect(classes).toContain("bg-amber-500");
        expect(classes).not.toContain("bg-secondary");
    });

    scopedIt("replaces the neutral Button background through theme-override", async () => {
        const { default: Button } = await import("@vueda/controls/button/Button.vue");
        const wrapper = mount(Button, {
            props: {
                tone: "neutral",
                emphasis: "fill",
                themeOverride: { Button: { root: { class: "bg-amber-500 text-heading text-foreground" } } },
            },
        });
        expect(wrapper.classes()).toEqual(expect.arrayContaining(["bg-amber-500", "text-heading", "text-foreground"]));
        expect(wrapper.classes()).not.toContain("bg-secondary");
        wrapper.unmount();
    });

    scopedIt("replaces composed defaults through a global patch after registration", async () => {
        const { default: Button } = await import("@vueda/controls/button/Button.vue");
        const { patchTheme } = await import("@vueda/use/themeRegistry.js");
        patchTheme({ Button: { root: { class: "bg-amber-500" } } });
        const wrapper = mount(Button);
        expect(wrapper.classes()).toContain("bg-amber-500");
        expect(wrapper.classes()).not.toContain("bg-secondary");
        wrapper.unmount();
    });

    scopedIt("keeps plain class additive outside the theme merger", async () => {
        const { default: Button } = await import("@vueda/controls/button/Button.vue");
        const wrapper = mount(Button, { props: { class: "bg-amber-500" } });
        expect(wrapper.classes()).toEqual(expect.arrayContaining(["bg-secondary", "bg-amber-500"]));
        wrapper.unmount();
    });
});
