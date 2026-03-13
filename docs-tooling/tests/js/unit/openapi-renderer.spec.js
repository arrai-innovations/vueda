import { OpenApiNormalizer } from "../../../js/normalizers/openapi.js";
import { renderOpenApiBundle } from "../../../js/renderers/openapi.js";
import { describe, expect, it } from "vitest";

const payload = {
    openapi: "3.0.3",
    info: { title: "Test API", version: "0.1.0" },
    paths: {
        "/widgets/{id}": {
            get: {
                operationId: "widgets_retrieve",
                description: "Fetch a widget.",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    200: {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Widget" },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            Widget: {
                type: "object",
                description: "Widget object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                },
                required: ["id"],
            },
        },
    },
};

function buildOutputs() {
    const bundle = new OpenApiNormalizer().normalize(payload);
    return renderOpenApiBundle(bundle);
}

describe("renderOpenApiBundle", () => {
    it("generates an endpoint page", () => {
        const outputs = buildOutputs();
        expect(outputs.has("rest/widgets/widgets_retrieve.md")).toBe(true);
    });

    it("generates a schema page", () => {
        const outputs = buildOutputs();
        expect(outputs.has("rest/schemas/Widget.md")).toBe(true);
    });

    it("endpoint page includes the operation description", () => {
        const outputs = buildOutputs();
        const page = outputs.get("rest/widgets/widgets_retrieve.md");
        expect(page).toBeDefined();
        expect(page).toContain("Fetch a widget.");
    });

    it("endpoint page includes the HTTP method in the signature block", () => {
        const outputs = buildOutputs();
        const page = outputs.get("rest/widgets/widgets_retrieve.md");
        expect(page).toContain("GET");
    });

    it("endpoint page includes the path in the signature block", () => {
        const outputs = buildOutputs();
        const page = outputs.get("rest/widgets/widgets_retrieve.md");
        expect(page).toContain("/widgets/{id}");
    });

    it("schema page includes a properties table", () => {
        const outputs = buildOutputs();
        const page = outputs.get("rest/schemas/Widget.md");
        expect(page).toBeDefined();
        expect(page).toContain("## Properties");
        expect(page).toContain("id");
        expect(page).toContain("name");
    });

    it("schema page includes the schema description", () => {
        const outputs = buildOutputs();
        const page = outputs.get("rest/schemas/Widget.md");
        expect(page).toContain("Widget object");
    });

    it("each page frontmatter includes id, kind, and source fields", () => {
        const outputs = buildOutputs();
        const endpointPage = outputs.get("rest/widgets/widgets_retrieve.md");
        const schemaPage = outputs.get("rest/schemas/Widget.md");
        for (const page of [endpointPage, schemaPage]) {
            expect(page).toContain("id:");
            expect(page).toContain("kind:");
            expect(page).toContain('source: "openapi"');
        }
    });

    it("endpoint page H1 falls back to operation ID when no summary", () => {
        const outputs = buildOutputs();
        const page = outputs.get("rest/widgets/widgets_retrieve.md");
        expect(page).toContain("# widgets_retrieve");
    });

    it("endpoint page H1 uses summary (displayName) when available", () => {
        const payloadWithSummary = {
            openapi: "3.0.3",
            info: { title: "Test API", version: "0.1.0" },
            paths: {
                "/widgets/{id}": {
                    get: {
                        operationId: "widgets_retrieve",
                        summary: "Retrieve a widget",
                        description: "Fetch a widget by its ID.",
                        responses: { 200: { description: "OK" } },
                    },
                },
            },
        };
        const bundle = new OpenApiNormalizer().normalize(payloadWithSummary);
        const outputs = renderOpenApiBundle(bundle);
        const page = outputs.get("rest/widgets/widgets_retrieve.md");
        expect(page).toContain("# Retrieve a widget");
        expect(page).toContain('title: "Retrieve a widget"');
    });

    it("generates a group index page for each endpoint group", () => {
        const outputs = buildOutputs();
        expect(outputs.has("rest/widgets/index.md")).toBe(true);
    });

    it("group index page uses displayName as link label when available", () => {
        const payloadWithSummary = {
            openapi: "3.0.3",
            info: { title: "Test API", version: "0.1.0" },
            paths: {
                "/widgets/{id}": {
                    get: {
                        operationId: "widgets_retrieve",
                        summary: "Retrieve a widget",
                        responses: { 200: { description: "OK" } },
                    },
                },
            },
        };
        const bundle = new OpenApiNormalizer().normalize(payloadWithSummary);
        const outputs = renderOpenApiBundle(bundle);
        const indexPage = outputs.get("rest/widgets/index.md");
        expect(indexPage).toContain("Retrieve a widget");
    });

    it("group index page falls back to operation ID when no summary", () => {
        const outputs = buildOutputs();
        const indexPage = outputs.get("rest/widgets/index.md");
        expect(indexPage).toContain("widgets_retrieve");
    });
});
