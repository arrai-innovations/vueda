import { describe, expect, it } from "vitest";

import { VueDocgenNormalizer } from "../../../js/normalizers/vue-docgen-api.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";

describe("VueDocgenNormalizer", () => {
  it("produces canonical output that validates against the schema", async () => {
    const normalizer = new VueDocgenNormalizer();
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

    const output = normalizer.normalize(payload);

    await assertCanonical(output);

    expect(output.source).toBe("vue-docgen");
    expect(output.roots).toEqual(["ui:component:Foo"]);
    expect(output.nodes.some((node) => node.kind === "slot")).toBe(true);
    expect(output.nodes.some((node) => node.kind === "event")).toBe(true);
  });
});
