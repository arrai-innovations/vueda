import { OpenApiNormalizer } from "../../../js/normalizers/openapi.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";
import { describe, expect, it } from "vitest";

describe("OpenApiNormalizer", () => {
    it("produces canonical output that validates against the schema", async () => {
        const normalizer = new OpenApiNormalizer();
        const payload = {
            openapi: "3.0.3",
            info: { title: "Test API", version: "0.1.0" },
            paths: {
                "/widgets/{id}": {
                    get: {
                        operationId: "widgets_retrieve",
                        description: "Fetch a widget.",
                        parameters: [
                            {
                                name: "id",
                                in: "path",
                                required: true,
                                schema: { type: "string" },
                            },
                        ],
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

        const output = normalizer.normalize(payload);

        await assertCanonical(output);

        expect(output.source).toBe("openapi");
        expect(output.roots).toEqual(["rest:root"]);
        expect(output.nodes.some((node) => node.kind === "endpoint")).toBe(true);
        expect(output.nodes.some((node) => node.kind === "schema")).toBe(true);

        const endpoint = output.nodes.find((node) => node.kind === "endpoint");
        expect(endpoint.displayName).toBeUndefined();
        expect(endpoint.description).toBe("Fetch a widget.");
    });

    it("stores summary in displayName and description separately", () => {
        const normalizer = new OpenApiNormalizer();
        const payload = {
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

        const output = normalizer.normalize(payload);
        const endpoint = output.nodes.find((node) => node.kind === "endpoint");
        expect(endpoint.displayName).toBe("Retrieve a widget");
        expect(endpoint.description).toBe("Fetch a widget by its ID.");
    });

    it("omits displayName when only description is present", () => {
        const normalizer = new OpenApiNormalizer();
        const payload = {
            openapi: "3.0.3",
            info: { title: "Test API", version: "0.1.0" },
            paths: {
                "/widgets/{id}": {
                    get: {
                        operationId: "widgets_retrieve",
                        description: "Fetch a widget.",
                        responses: { 200: { description: "OK" } },
                    },
                },
            },
        };

        const output = normalizer.normalize(payload);
        const endpoint = output.nodes.find((node) => node.kind === "endpoint");
        expect(endpoint.displayName).toBeUndefined();
        expect(endpoint.description).toBe("Fetch a widget.");
    });
});
