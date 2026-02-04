import { describe, expect, it } from "vitest";

import { TypeDocNormalizer } from "../../../js/normalizers/typedoc.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";

describe("TypeDocNormalizer", () => {
  it("produces canonical output that validates against the schema", async () => {
    const normalizer = new TypeDocNormalizer();
    const payload = {
      name: "vueda",
      children: [
        {
          id: 1,
          name: "math",
          kind: 2,
          children: [
            {
              id: 2,
              name: "sum",
              kind: 64,
              comment: {
                summary: [{ kind: "text", text: "Add two numbers." }],
              },
              signatures: [
                {
                  id: 3,
                  name: "sum",
                  parameters: [
                    {
                      id: 4,
                      name: "a",
                      flags: {},
                      type: { type: "intrinsic", name: "number" },
                    },
                    {
                      id: 5,
                      name: "b",
                      flags: {},
                      type: { type: "intrinsic", name: "number" },
                    },
                  ],
                  type: { type: "intrinsic", name: "number" },
                },
              ],
              sources: [
                {
                  fileName: "client/lib/math.js",
                  line: 1,
                  url: "https://example.test/math.js#L1",
                },
              ],
            },
          ],
        },
      ],
    };

    const output = normalizer.normalize(payload);

    await assertCanonical(output);

    expect(output.source).toBe("typedoc");
    expect(output.roots.length).toBe(1);
    expect(output.nodes.some((node) => node.kind === "function")).toBe(true);
  });
});
