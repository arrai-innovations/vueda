import { describe, expect, it } from "vitest";

import { OpenApiNormalizer } from "../../../js/normalizers/openapi.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";

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
              "200": {
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
    expect(output.roots).toEqual(["api:root"]);
    expect(output.nodes.some((node) => node.kind === "endpoint")).toBe(true);
    expect(output.nodes.some((node) => node.kind === "schema")).toBe(true);
  });
});
