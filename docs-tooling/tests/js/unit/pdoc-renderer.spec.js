import { PdocNormalizer } from "../../../js/normalizers/pdoc.js";
import { renderPdocBundle } from "../../../js/renderers/pdoc.js";
import { describe, expect, it } from "vitest";

const makePayload = () => ({
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
            members: [
                "vueda.example.Helper.do_work",
                "vueda.example.Helper.__doc__",
                "vueda.example.Helper.__str__",
                "vueda.example.Helper.__module__",
            ],
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
            is_public: true,
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
        {
            kind: "variable",
            name: "__doc__",
            fullname: "vueda.example.Helper.__doc__",
            modulename: "vueda.example",
            qualname: "Helper.__doc__",
            docstring: "",
            is_public: false,
            source_file: "/srv/vueda/example.py",
            source_lines: { start: 8, end: 8 },
        },
        {
            kind: "function",
            name: "__str__",
            fullname: "vueda.example.Helper.__str__",
            modulename: "vueda.example",
            qualname: "Helper.__str__",
            docstring: "Return the helper's display name.",
            is_public: true,
            signature_details: {
                parameters: [{ name: "self", annotation: null, default: null }],
                return_annotation: "str",
            },
            source_file: "/srv/vueda/example.py",
            source_lines: { start: 14, end: 15 },
        },
        {
            kind: "variable",
            name: "__module__",
            fullname: "vueda.example.Helper.__module__",
            modulename: "vueda.example",
            qualname: "Helper.__module__",
            docstring: "",
            is_public: true,
            source_file: "/srv/vueda/example.py",
            source_lines: { start: 7, end: 7 },
        },
    ],
});

function buildOutputs() {
    const normalizer = new PdocNormalizer();
    const bundle = normalizer.normalize(makePayload());
    return renderPdocBundle(bundle);
}

describe("renderPdocBundle with class members", () => {
    it("class member anchor paths are not emitted as separate output files", () => {
        const outputs = buildOutputs();
        for (const filePath of outputs.keys()) {
            expect(filePath).not.toContain("#");
        }
    });

    it("module page and class page are both in outputs", () => {
        const outputs = buildOutputs();
        const keys = [...outputs.keys()];
        expect(keys.some((k) => k.endsWith("example.md"))).toBe(true);
        expect(keys.some((k) => k.endsWith("Helper.md"))).toBe(true);
    });

    it("class page renders public member inline", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toBeDefined();
        expect(classPage).toContain("do_work");
    });

    it("class page excludes non-public members", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).not.toContain("__doc__");
    });

    it("class page frontmatter contains member_ids for public members only", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toContain("member_ids");
        expect(classPage).toContain("py:function:vueda.example.Helper.do_work");
        expect(classPage).not.toContain("py:property:vueda.example.Helper.__doc__");
    });

    it("class page includes documented dunders", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toContain("__str__");
    });

    it("class page excludes undocumented dunders that pdoc marks public", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).not.toContain("__module__");
    });

    it("inline member section uses anchor heading syntax", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toMatch(/## do_work \{#do_work\}/);
    });

    it("module page H1 uses last-two-segment qualified name", () => {
        const outputs = buildOutputs();
        const modulePage = [...outputs.entries()].find(([k]) => k.endsWith("example.md"))?.[1];
        expect(modulePage).toContain("# vueda.example");
    });
});
