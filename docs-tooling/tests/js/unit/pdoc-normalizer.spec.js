import { describe, expect, it } from "vitest";

import { PdocNormalizer } from "../../../js/normalizers/pdoc.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";

describe("PdocNormalizer", () => {
  it("produces canonical output that validates against the schema", async () => {
    const normalizer = new PdocNormalizer();
    const payload = {
      module_names: ["vueda.example"],
      docs: [
        {
          kind: "module",
          name: "example",
          fullname: "vueda.example",
          modulename: "vueda.example",
          qualname: "",
          docstring: "Example module.",
          members: ["vueda.example.Helper"],
          submodules: [],
          source_file: "/srv/vueda/example.py",
          source_lines: { start: 1, end: 5 },
        },
        {
          kind: "class",
          name: "Helper",
          fullname: "vueda.example.Helper",
          modulename: "vueda.example",
          qualname: "Helper",
          docstring: "Helper class.",
          members: ["vueda.example.Helper.do_work"],
          source_file: "/srv/vueda/example.py",
          source_lines: { start: 7, end: 20 },
        },
        {
          kind: "function",
          name: "do_work",
          fullname: "vueda.example.Helper.do_work",
          modulename: "vueda.example",
          qualname: "Helper.do_work",
          docstring: "Do the work.",
          signature_details: {
            parameters: [
              { name: "self", annotation: null, default: null },
              { name: "value", annotation: "int", default: 1 },
            ],
            return_annotation: "str",
          },
          source_file: "/srv/vueda/example.py",
          source_lines: { start: 9, end: 12 },
        },
      ],
    };

    const output = normalizer.normalize(payload);

    await assertCanonical(output);

    expect(output.source).toBe("pdoc");
    expect(output.roots).toEqual(["py:module:vueda.example"]);
    expect(output.nodes.some((node) => node.kind === "class")).toBe(true);
  });
});
