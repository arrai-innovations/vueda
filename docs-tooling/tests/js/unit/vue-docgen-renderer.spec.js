import { VueDocgenNormalizer } from "../../../js/normalizers/vue-docgen-api.js";
import { renderVueDocgenBundle } from "../../../js/renderers/vue-docgen.js";
import { describe, expect, it } from "vitest";

// Sparse fixture: 1 undescribed slot, 1 described event.
// Expected: no slots sub-page (below threshold, no description), events sub-page (has description).
const sparsePayload = {
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
                    slots: [{ name: "default", scoped: false, bindings: [{ name: "value" }] }],
                    events: [{ name: "submit", description: "When submitted" }],
                    tags: {},
                    sourceFiles: ["/abs/path/Foo.vue"],
                },
            ],
        },
    ],
};

// Rich fixture: described slot + many slots trigger slots sub-page;
// described event triggers events sub-page.
const richPayload = {
    sourceDir: "client/lib",
    files: [
        {
            filePath: "client/lib/components/Bar.vue",
            components: [
                {
                    displayName: "Bar",
                    description: "Rich component",
                    props: [],
                    slots: [
                        { name: "header", description: "Page header area.", scoped: false, bindings: [] },
                        { name: "default", scoped: false, bindings: [] },
                    ],
                    events: [{ name: "click", description: "Emitted on click." }],
                    tags: {},
                    sourceFiles: [],
                },
            ],
        },
    ],
};

// Plain fixture: undescribed slots and events below threshold — no sub-pages at all.
const plainPayload = {
    sourceDir: "client/lib",
    files: [
        {
            filePath: "client/lib/components/Baz.vue",
            components: [
                {
                    displayName: "Baz",
                    props: [],
                    slots: [{ name: "default", scoped: false, bindings: [] }],
                    events: [{ name: "close" }],
                    tags: {},
                    sourceFiles: [],
                },
            ],
        },
    ],
};

function buildOutputs(payload) {
    const bundle = new VueDocgenNormalizer().normalize(payload);
    return renderVueDocgenBundle(bundle);
}

describe("renderVueDocgenBundle — conditional sub-pages", () => {
    it("omits slots sub-page when slot count is below threshold and no slot has a description", () => {
        const outputs = buildOutputs(sparsePayload);
        expect(outputs.has("vue/components/Foo/slots.md")).toBe(false);
    });

    it("emits events sub-page when any event has a description", () => {
        const outputs = buildOutputs(sparsePayload);
        expect(outputs.has("vue/components/Foo/events.md")).toBe(true);
    });

    it("sparse component produces exactly three output files (component + events + index)", () => {
        const outputs = buildOutputs(sparsePayload);
        expect(outputs.size).toBe(3);
    });

    it("emits slots sub-page when any slot has a description", () => {
        const outputs = buildOutputs(richPayload);
        expect(outputs.has("vue/components/Bar/slots.md")).toBe(true);
    });

    it("emits events sub-page for rich fixture when event has a description", () => {
        const outputs = buildOutputs(richPayload);
        expect(outputs.has("vue/components/Bar/events.md")).toBe(true);
    });

    it("omits both sub-pages when all slots and events are undescribed and below threshold", () => {
        const outputs = buildOutputs(plainPayload);
        expect(outputs.has("vue/components/Baz/slots.md")).toBe(false);
        expect(outputs.has("vue/components/Baz/events.md")).toBe(false);
        // Two files: the component page and the index.
        expect(outputs.size).toBe(2);
    });

    it("component page shows a compact slot table and CTA link when sub-page exists", () => {
        const outputs = buildOutputs(richPayload);
        const page = outputs.get("vue/components/Bar.md");
        // Compact table row present
        expect(page).toContain("`header`");
        // CTA link to sub-page
        expect(page).toContain("slots.md");
        // No per-slot H3 headings
        expect(page).not.toMatch(/^### /m);
    });

    it("component page shows full inline slot detail (H3 per slot) when no sub-page", () => {
        const outputs = buildOutputs(plainPayload);
        const page = outputs.get("vue/components/Baz.md");
        expect(page).toContain("### `default`");
        expect(page).not.toContain("slots.md");
    });

    it("component page shows a compact event table and CTA link when sub-page exists", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo.md");
        // Compact table row present
        expect(page).toContain("`submit`");
        // CTA link to sub-page
        expect(page).toContain("events.md");
        // No per-event H3 heading (event name is in a table, not a heading)
        expect(page).not.toContain("### `submit`");
    });

    it("component page shows full inline event detail (H3 per event) when no sub-page", () => {
        const outputs = buildOutputs(plainPayload);
        const page = outputs.get("vue/components/Baz.md");
        expect(page).toContain("### `close`");
        expect(page).not.toContain("events.md");
    });
});

describe("renderVueDocgenBundle — component page content", () => {
    it("component page includes a props table", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toBeDefined();
        expect(page).toContain("## Props");
        expect(page).toContain("bar");
    });

    it("component page includes the component description", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toContain("Test component");
    });

    it("component page always shows slots inline regardless of sub-page", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toContain("default");
    });

    it("events sub-page lists the event and its description", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo/events.md");
        expect(page).toBeDefined();
        expect(page).toContain("submit");
        expect(page).toContain("When submitted");
    });

    it("slots sub-page lists the slot", () => {
        const outputs = buildOutputs(richPayload);
        const page = outputs.get("vue/components/Bar/slots.md");
        expect(page).toBeDefined();
        expect(page).toContain("header");
    });

    it("slots sub-page shows Also accepted line when slot has fallbacks", () => {
        const payload = {
            sourceDir: "client/lib",
            files: [
                {
                    filePath: "client/lib/components/Qux.vue",
                    components: [
                        {
                            displayName: "Qux",
                            props: [],
                            slots: [
                                // Bracket-form annotation: artifact name resolved via description
                                {
                                    name: "resolvedSlotNames.btn.name",
                                    description: "[toggle-button, fieldset-toggle-button] Toggles visibility.",
                                    scoped: false,
                                    bindings: [],
                                },
                                // Extra described slot to push past the sub-page threshold
                                { name: "header", description: "Page header.", scoped: false, bindings: [] },
                            ],
                            events: [],
                            tags: {},
                            sourceFiles: [],
                        },
                    ],
                },
            ],
        };
        const outputs = buildOutputs(payload);
        const page = outputs.get("vue/components/Qux/slots.md");
        expect(page).toBeDefined();
        expect(page).toContain("Also accepted:");
        expect(page).toContain("`fieldset-toggle-button`");
        expect(page).toContain("Toggles visibility.");
    });

    it("component page frontmatter includes id, kind, and source fields", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toContain("id:");
        expect(page).toContain("kind:");
        expect(page).toContain('source: "vue-docgen"');
    });
});

// Multi-group payload: one view and one widget, to exercise group splitting.
const multiGroupPayload = {
    sourceDir: "client/lib",
    files: [
        {
            filePath: "client/lib/views/DashboardView.vue",
            components: [
                {
                    displayName: "DashboardView",
                    description: "Main dashboard.",
                    props: [],
                    slots: [],
                    events: [],
                    tags: {},
                    sourceFiles: ["client/lib/views/DashboardView.vue"],
                },
            ],
        },
        {
            filePath: "client/lib/widgets/CounterWidget.vue",
            components: [
                {
                    displayName: "CounterWidget",
                    description: "A counter.",
                    props: [],
                    slots: [],
                    events: [],
                    tags: {},
                    sourceFiles: ["client/lib/widgets/CounterWidget.vue"],
                },
            ],
        },
    ],
};

describe("renderVueDocgenBundle — theme entry bidirectional link", () => {
    it("appends a 'Theme entry' line when the component name is in themeKeysIndex", () => {
        const bundle = new VueDocgenNormalizer().normalize(sparsePayload);
        const outputs = renderVueDocgenBundle(bundle, { themeKeysIndex: new Set(["Foo"]) });
        const page = outputs.get("vue/components/Foo.md");
        expect(page).toContain("Theme entry: {@api theme-key:Foo}");
    });

    it("omits the 'Theme entry' line when themeKeysIndex is absent", () => {
        const outputs = buildOutputs(sparsePayload);
        const page = outputs.get("vue/components/Foo.md");
        expect(page).not.toContain("Theme entry:");
    });

    it("omits the 'Theme entry' line when the component name is not in the index", () => {
        const bundle = new VueDocgenNormalizer().normalize(sparsePayload);
        const outputs = renderVueDocgenBundle(bundle, { themeKeysIndex: new Set(["NotFoo"]) });
        const page = outputs.get("vue/components/Foo.md");
        expect(page).not.toContain("Theme entry:");
    });

    it("emits 'Theme entry' for each matching component when multiple are present", () => {
        const bundle = new VueDocgenNormalizer().normalize(multiGroupPayload);
        const outputs = renderVueDocgenBundle(bundle, {
            themeKeysIndex: new Set(["DashboardView", "CounterWidget"]),
        });
        expect(outputs.get("vue/components/DashboardView.md")).toContain("Theme entry: {@api theme-key:DashboardView}");
        expect(outputs.get("vue/components/CounterWidget.md")).toContain("Theme entry: {@api theme-key:CounterWidget}");
    });

    it("only emits 'Theme entry' on the matching component in a multi-component bundle", () => {
        const bundle = new VueDocgenNormalizer().normalize(multiGroupPayload);
        const outputs = renderVueDocgenBundle(bundle, { themeKeysIndex: new Set(["DashboardView"]) });
        expect(outputs.get("vue/components/DashboardView.md")).toContain("Theme entry:");
        expect(outputs.get("vue/components/CounterWidget.md")).not.toContain("Theme entry:");
    });
});

describe("renderVueDocgenBundle — component index page", () => {
    it("emits vue/components/index.md", () => {
        const outputs = buildOutputs(sparsePayload);
        expect(outputs.has("vue/components/index.md")).toBe(true);
    });

    it("index page links to each component page", () => {
        const outputs = buildOutputs(sparsePayload);
        const index = outputs.get("vue/components/index.md");
        expect(index).toContain("### [`Foo`](Foo.md)");
    });

    it("index page includes component description", () => {
        const outputs = buildOutputs(sparsePayload);
        const index = outputs.get("vue/components/index.md");
        expect(index).toContain("Test component");
    });

    it("index page uses heading and paragraph layout instead of a table", () => {
        const outputs = buildOutputs(sparsePayload);
        const index = outputs.get("vue/components/index.md");
        expect(index).not.toContain("| Component | Description |");
    });

    it("index page renders a section heading for each source group", () => {
        const outputs = buildOutputs(multiGroupPayload);
        const index = outputs.get("vue/components/index.md");
        expect(index).toContain("## Views");
        expect(index).toContain("## Widgets");
        expect(index).not.toContain("## Components");
    });

    it("views group appears before widgets group in the index", () => {
        const outputs = buildOutputs(multiGroupPayload);
        const index = outputs.get("vue/components/index.md");
        expect(index.indexOf("## Views")).toBeLessThan(index.indexOf("## Widgets"));
    });

    it("index page frontmatter includes source vue-docgen", () => {
        const outputs = buildOutputs(sparsePayload);
        const index = outputs.get("vue/components/index.md");
        expect(index).toContain('source: "vue-docgen"');
    });
});
