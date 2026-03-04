import { VueDocgenNormalizer } from "../../../js/normalizers/vue-docgen-api.js";
import { renderVueDocgenBundle } from "../../../js/renderers/vue-docgen.js";
import { describe, expect, it } from "vitest";

const payload = {
    sourceDir: "client/lib",
    files: [
        {
            filePath: "client/lib/components/Foo.vue",
            components: [
                {
                    displayName: "Foo",
                    description: "Test component",
                    props: [
                        {
                            name: "bar",
                            description: "Bar prop",
                            type: { name: "string" },
                            required: true,
                            defaultValue: { value: "'x'" },
                        },
                    ],
                    slots: [
                        {
                            name: "default",
                            scoped: false,
                            bindings: [{ name: "value" }],
                        },
                    ],
                    events: [{ name: "submit", description: "When submitted" }],
                    tags: {},
                    sourceFiles: ["/abs/path/Foo.vue"],
                },
            ],
        },
    ],
};

function buildOutputs() {
    const bundle = new VueDocgenNormalizer().normalize(payload);
    return renderVueDocgenBundle(bundle);
}

describe("renderVueDocgenBundle", () => {
    it("generates exactly three output files per component", () => {
        const outputs = buildOutputs();
        expect(outputs.size).toBe(3);
    });

    it("generates the component page, slots page, and events page", () => {
        const outputs = buildOutputs();
        expect(outputs.has("vue/components/Foo.md")).toBe(true);
        expect(outputs.has("vue/components/Foo/slots.md")).toBe(true);
        expect(outputs.has("vue/components/Foo/events.md")).toBe(true);
    });

    it("component page includes a props table", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toBeDefined();
        expect(page).toContain("## Props");
        expect(page).toContain("bar");
    });

    it("component page includes the component description", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toContain("Test component");
    });

    it("slots page lists the default slot", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo/slots.md");
        expect(page).toBeDefined();
        expect(page).toContain("default");
    });

    it("slots page has a heading containing the component name", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo/slots.md");
        expect(page).toContain("Foo");
    });

    it("events page lists the submit event", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo/events.md");
        expect(page).toBeDefined();
        expect(page).toContain("submit");
    });

    it("events page includes the event description", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo/events.md");
        expect(page).toContain("When submitted");
    });

    it("component page frontmatter includes id, kind, and source fields", () => {
        const outputs = buildOutputs();
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toContain("id:");
        expect(page).toContain("kind:");
        expect(page).toContain('source: "vue-docgen"');
    });
});
