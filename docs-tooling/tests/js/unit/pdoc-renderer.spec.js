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

describe("renderPdocBundle with submodules", () => {
    it("parent module page lists inferred submodule under Submodules heading", () => {
        const normalizer = new PdocNormalizer();
        const payload = {
            module_names: ["pkg", "pkg.sub"],
            docs: [
                {
                    kind: "module",
                    name: "pkg",
                    fullname: "pkg",
                    modulename: "pkg",
                    qualname: "",
                    docstring: "Top-level package.",
                    members: [],
                    submodules: [],
                },
                {
                    kind: "module",
                    name: "sub",
                    fullname: "pkg.sub",
                    modulename: "pkg.sub",
                    qualname: "",
                    docstring: "Sub-module.",
                    members: [],
                    submodules: [],
                },
            ],
        };
        const bundle = normalizer.normalize(payload);
        const outputs = renderPdocBundle(bundle);
        const pkgPage = [...outputs.entries()].find(([k]) => k === "py/pkg.md")?.[1];
        expect(pkgPage).toBeDefined();
        expect(pkgPage).toContain("## Submodules");
        expect(pkgPage).toContain("sub");
    });
});

describe("renderPdocBundle with deprecated lifecycle metadata", () => {
    it("module page renders the deprecation warning callout", () => {
        const normalizer = new PdocNormalizer();
        const bundle = normalizer.normalize({
            module_names: ["vueda.example"],
            docs: [
                {
                    kind: "module",
                    name: "example",
                    fullname: "vueda.example",
                    modulename: "vueda.example",
                    qualname: "",
                    docstring: "Example module.\n\n@deprecated Use vueda.new_example instead.",
                    members: [],
                    submodules: [],
                },
            ],
        });
        const outputs = renderPdocBundle(bundle);
        const page = outputs.get("py/vueda.example.md");
        expect(page).toContain("::: warning Deprecated");
        expect(page).toContain("Use vueda.new_example instead.");
    });
});

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

    it("class page includes undocumented public methods (class is the doc unit)", () => {
        const normalizer = new PdocNormalizer();
        const payload = makePayload();
        payload.docs[1].members.push("vueda.example.Helper.bare_method");
        payload.docs.push({
            kind: "function",
            name: "bare_method",
            fullname: "vueda.example.Helper.bare_method",
            modulename: "vueda.example",
            qualname: "Helper.bare_method",
            docstring: "",
            is_public: true,
            signature_details: {
                parameters: [{ name: "self", annotation: null, default: null }],
                return_annotation: null,
            },
        });
        const bundle = normalizer.normalize(payload);
        const outputs = renderPdocBundle(bundle);
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toMatch(/## `bare_method` \{#bare_method\}/);
    });

    it("class page includes documented dunders", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toContain("__str__");
    });

    it("hyphenates a dunder member's anchor, which markdown would otherwise emphasise", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toContain("## `__str__` {#--str--}");
        expect(classPage).not.toContain("{#__str__}");
    });

    it("hyphenates a dunder member's subsection anchors too", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toContain("{#--str---signature}");
    });

    it("class page excludes undocumented dunders that pdoc marks public", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).not.toContain("__module__");
    });

    it("inline member section uses anchor heading syntax", () => {
        const outputs = buildOutputs();
        const classPage = [...outputs.entries()].find(([k]) => k.endsWith("Helper.md"))?.[1];
        expect(classPage).toMatch(/## `do_work` \{#do_work\}/);
    });

    it("module page H1 uses last-two-segment qualified name", () => {
        const outputs = buildOutputs();
        const modulePage = [...outputs.entries()].find(([k]) => k.endsWith("example.md"))?.[1];
        expect(modulePage).toContain("# vueda.example");
    });
});

describe("renderPdocBundle module-level inlining", () => {
    const modulePayload = () => ({
        module_names: ["vueda.mod"],
        docs: [
            {
                kind: "module",
                name: "mod",
                fullname: "vueda.mod",
                modulename: "vueda.mod",
                qualname: "",
                docstring: "Module docs.",
                members: [
                    "vueda.mod.documented_helper",
                    "vueda.mod.undocumented_helper",
                    "vueda.mod.ADDED",
                    "vueda.mod.DOC_CONST",
                    "vueda.mod.Thing",
                ],
                submodules: [],
                source_file: "/srv/vueda/mod.py",
                source_lines: { start: 1, end: 30 },
            },
            {
                kind: "function",
                name: "documented_helper",
                fullname: "vueda.mod.documented_helper",
                modulename: "vueda.mod",
                qualname: "documented_helper",
                docstring: "Does a documented thing.",
                is_public: true,
                signature_details: { parameters: [], return_annotation: "None" },
                source_file: "/srv/vueda/mod.py",
                source_lines: { start: 3, end: 5 },
            },
            {
                kind: "function",
                name: "undocumented_helper",
                fullname: "vueda.mod.undocumented_helper",
                modulename: "vueda.mod",
                qualname: "undocumented_helper",
                docstring: "",
                is_public: true,
                signature_details: { parameters: [], return_annotation: "None" },
                source_file: "/srv/vueda/mod.py",
                source_lines: { start: 7, end: 8 },
            },
            {
                kind: "variable",
                name: "ADDED",
                fullname: "vueda.mod.ADDED",
                modulename: "vueda.mod",
                qualname: "ADDED",
                docstring: "",
                is_public: true,
                source_file: "/srv/vueda/mod.py",
                source_lines: { start: 10, end: 10 },
            },
            {
                kind: "variable",
                name: "DOC_CONST",
                fullname: "vueda.mod.DOC_CONST",
                modulename: "vueda.mod",
                qualname: "DOC_CONST",
                docstring: "A documented constant.",
                is_public: true,
                source_file: "/srv/vueda/mod.py",
                source_lines: { start: 12, end: 12 },
            },
            {
                kind: "class",
                name: "Thing",
                fullname: "vueda.mod.Thing",
                modulename: "vueda.mod",
                qualname: "Thing",
                docstring: "A thing.",
                members: [],
                source_file: "/srv/vueda/mod.py",
                source_lines: { start: 15, end: 25 },
            },
        ],
    });

    function buildModuleOutputs() {
        const bundle = new PdocNormalizer().normalize(modulePayload());
        return renderPdocBundle(bundle);
    }

    it("does not emit standalone files for module-level functions or properties", () => {
        const outputs = buildModuleOutputs();
        const keys = [...outputs.keys()];
        expect(keys).not.toContain("py/vueda.mod/documented_helper.md");
        expect(keys).not.toContain("py/vueda.mod/DOC_CONST.md");
        expect(keys).not.toContain("py/vueda.mod/ADDED.md");
        expect(keys).not.toContain("py/vueda.mod/undocumented_helper.md");
    });

    it("still emits standalone files for module-level classes", () => {
        const outputs = buildModuleOutputs();
        expect([...outputs.keys()]).toContain("py/vueda.mod/Thing.md");
    });

    it("inlines documented module-level members on the module page", () => {
        const outputs = buildModuleOutputs();
        const modulePage = outputs.get("py/vueda.mod.md");
        expect(modulePage).toMatch(/## `documented_helper` \{#documented_helper\}/);
        expect(modulePage).toMatch(/## `DOC_CONST` \{#DOC_CONST\}/);
    });

    it("filters undocumented non-class, non-module members from the module page", () => {
        const outputs = buildModuleOutputs();
        const modulePage = outputs.get("py/vueda.mod.md");
        expect(modulePage).not.toContain("undocumented_helper");
        expect(modulePage).not.toMatch(/## ADDED/);
    });

    it("lists classes under a Classes heading on the module page", () => {
        const outputs = buildModuleOutputs();
        const modulePage = outputs.get("py/vueda.mod.md");
        expect(modulePage).toContain("## Classes");
        expect(modulePage).toContain("Thing");
    });

    it("module page frontmatter member_ids covers inlined members only", () => {
        const outputs = buildModuleOutputs();
        const modulePage = outputs.get("py/vueda.mod.md");
        expect(modulePage).toContain("py:function:vueda.mod.documented_helper");
        expect(modulePage).toContain("py:property:vueda.mod.DOC_CONST");
        expect(modulePage).not.toContain("py:property:vueda.mod.ADDED");
        expect(modulePage).not.toContain("py:function:vueda.mod.undocumented_helper");
        expect(modulePage).not.toContain("py:class:vueda.mod.Thing");
    });
});

describe("renderPdocBundle anchor collision avoidance", () => {
    function buildCollisionBundle(memberName) {
        return {
            schemaVersion: "1.0",
            source: "pdoc",
            nodes: [
                {
                    id: "py:module:pkg.mod",
                    kind: "module",
                    name: "mod",
                    children: ["py:class:pkg.mod.MyModel"],
                    extensions: { pdoc: { fullname: "pkg.mod", qualname: "", modulename: "pkg.mod" } },
                },
                {
                    id: "py:class:pkg.mod.MyModel",
                    kind: "class",
                    name: "MyModel",
                    description: "A model.",
                    source: { file: "server/mod.py", line: 1 },
                    children: [`py:property:pkg.mod.MyModel.${memberName}`],
                    extensions: {
                        pdoc: {
                            fullname: "pkg.mod.MyModel",
                            qualname: "MyModel",
                            modulename: "pkg.mod",
                            is_public: true,
                        },
                    },
                },
                {
                    id: `py:property:pkg.mod.MyModel.${memberName}`,
                    kind: "property",
                    name: memberName,
                    description: "A field.",
                    extensions: {
                        pdoc: {
                            fullname: `pkg.mod.MyModel.${memberName}`,
                            qualname: `MyModel.${memberName}`,
                            modulename: "pkg.mod",
                            is_public: true,
                        },
                    },
                },
            ],
        };
    }

    function renderCollisionCase(memberName) {
        const outputs = renderPdocBundle(buildCollisionBundle(memberName));
        return [...outputs.entries()].find(([k]) => k.endsWith("MyModel.md"))?.[1];
    }

    it("disambiguates Source heading when a member is named 'source'", () => {
        const page = renderCollisionCase("source");
        expect(page).toContain("## `source` {#source}");
        expect(page).toContain("## Source {#source-section}");
    });

    it("disambiguates Overview heading when a member is named 'overview'", () => {
        const page = renderCollisionCase("overview");
        expect(page).toContain("## `overview` {#overview}");
        expect(page).toContain("## Overview {#overview-section}");
    });

    it("leaves Source heading unchanged when no collision exists", () => {
        const page = renderCollisionCase("name");
        expect(page).toContain("## Source\n");
        expect(page).not.toContain("source-section");
    });
});
