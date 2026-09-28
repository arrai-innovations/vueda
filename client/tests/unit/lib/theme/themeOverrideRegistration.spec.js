import { scopedIt } from "@tests/unit/utils.js";
import { normalizeClass, reactive } from "vue";

const loaders = {
    aggregate: () => import("@vueda/theme/vueda-tailwind/index.js"),
    family: () => import("@vueda/theme/vueda-tailwind/controls/index.js"),
    component: () => import("@vueda/controls/button/Button.vue"),
};
const context = { tone: "neutral", emphasis: "fill", size: "default" };
const project = {
    _Project: { root: { class: "project-primitive" } },
    Button: { root: { class: "project-own", composes: ["_Project.root"] } },
};

async function freshRegistry() {
    vi.resetModules();
    return import("@vueda/use/useTheme.js");
}

describe("lib/theme/vueda-tailwind/*.js", () => {
    describe("Project overrides across registration paths", () => {
        scopedIt.each(Object.keys(loaders))("%s resolves identically in both registration orders", async (path) => {
            const results = [];
            for (const projectFirst of [true, false]) {
                const api = await freshRegistry();
                if (projectFirst) {
                    api.overrideTheme(project);
                }
                await loaders[path]();
                if (!projectFirst) {
                    api.overrideTheme(project);
                }
                const theme = api.useTheme("Button", reactive({}), context);
                const classes = normalizeClass(theme("root"));
                expect(classes.startsWith("project-primitive ")).toBe(true);
                expect(classes.endsWith(" project-own")).toBe(true);
                expect(classes).toContain("h-vueda-control");
                expect(classes).not.toContain("bg-secondary");
                expect(api.getTheme()._Project).toBeUndefined();
                results.push(classes);
                theme.es.stop();
            }
            expect(results[0]).toBe(results[1]);
        });

        scopedIt.each([true, false])(
            "aggregate snapshot excludes overrides registered before import: %s",
            async (projectFirst) => {
                const api = await freshRegistry();
                if (projectFirst) {
                    api.overrideTheme(project);
                }
                const { default: snapshot } = await loaders.aggregate();
                if (!projectFirst) {
                    api.overrideTheme(project);
                }
                expect(snapshot._Project).toBeUndefined();
                const theme = api.useTheme("Button", reactive({}), context);
                const before = normalizeClass(theme("root"));
                api.setTheme(snapshot);
                expect(normalizeClass(theme("root"))).toBe(before);
                expect(api.getTheme()._Project).toBeUndefined();
                api.clearThemeOverrides();
                expect(normalizeClass(theme("root"))).not.toContain("project-own");
                expect(normalizeClass(theme("root"))).toContain("bg-secondary");
                theme.es.stop();
            },
        );
    });
});
