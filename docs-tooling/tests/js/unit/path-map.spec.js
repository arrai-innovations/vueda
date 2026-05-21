import { OpenApiNormalizer } from "../../../js/normalizers/openapi.js";
import { PdocNormalizer } from "../../../js/normalizers/pdoc.js";
import { TypeDocNormalizer } from "../../../js/normalizers/typedoc.js";
import { VueDocgenNormalizer } from "../../../js/normalizers/vue-docgen-api.js";
import { buildCanonicalIndex } from "../../../js/utils/index-canonical.js";
import {
    buildOpenApiPathMap,
    buildPdocPathMap,
    buildTypedocPathMap,
    buildVueDocgenPathMap,
} from "../../../js/utils/path-map.js";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Shared normalizer payloads (reused from normalizer spec files)
// ---------------------------------------------------------------------------

const pdocPayload = () => ({
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
            members: [],
            source_file: "/srv/vueda/example.py",
            source_lines: { start: 7, end: 20 },
        },
    ],
});

const typedocPayload = {
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
                    signatures: [{ id: 3, name: "sum", parameters: [], type: { type: "intrinsic", name: "number" } }],
                    sources: [{ fileName: "client/lib/math.js", line: 1 }],
                },
            ],
        },
    ],
};

const openapiPayload = {
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
                            "application/json": { schema: { $ref: "#/components/schemas/Widget" } },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            Widget: { type: "object", description: "Widget object", properties: { id: { type: "string" } } },
        },
    },
};

const vueDocgenPayload = {
    sourceDir: "client/lib",
    files: [
        {
            filePath: "client/lib/components/Foo.vue",
            components: [
                {
                    displayName: "Foo",
                    description: "Test component",
                    props: [{ name: "bar", type: { name: "string" }, required: true }],
                    slots: [{ name: "default", scoped: false, bindings: [] }],
                    events: [{ name: "submit", description: "When submitted" }],
                    tags: {},
                    sourceFiles: ["/abs/path/Foo.vue"],
                },
            ],
        },
    ],
};

// ---------------------------------------------------------------------------
// buildPdocPathMap
// ---------------------------------------------------------------------------

describe("buildPdocPathMap", () => {
    it("maps a root module id to its expected py/ path", () => {
        const bundle = new PdocNormalizer().normalize(pdocPayload());
        const index = buildCanonicalIndex(bundle);
        const pathMap = buildPdocPathMap(bundle, index);
        expect(pathMap.get("py:module:vueda.example")).toBe("py/vueda/example.md");
    });

    it("maps a class id to a path under the module directory", () => {
        const bundle = new PdocNormalizer().normalize(pdocPayload());
        const index = buildCanonicalIndex(bundle);
        const pathMap = buildPdocPathMap(bundle, index);
        expect(pathMap.get("py:class:vueda.example.Helper")).toBe("py/vueda/example/Helper.md");
    });
});

// ---------------------------------------------------------------------------
// buildTypedocPathMap
// ---------------------------------------------------------------------------

describe("buildTypedocPathMap", () => {
    it("maps a module id to its js/ path derived from the source file", () => {
        const bundle = new TypeDocNormalizer().normalize(typedocPayload);
        const index = buildCanonicalIndex(bundle);
        const pathMap = buildTypedocPathMap(bundle, index);
        const moduleEntry = [...pathMap.entries()].find(([, v]) => v === "js/math.md");
        expect(moduleEntry).toBeDefined();
    });

    it("maps a function id to a path under the module's functions/ subdirectory", () => {
        const bundle = new TypeDocNormalizer().normalize(typedocPayload);
        const index = buildCanonicalIndex(bundle);
        const pathMap = buildTypedocPathMap(bundle, index);
        const fnEntry = [...pathMap.entries()].find(([, v]) => v === "js/math/functions/sum.md");
        expect(fnEntry).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// buildOpenApiPathMap
// ---------------------------------------------------------------------------

describe("buildOpenApiPathMap", () => {
    it("maps an endpoint id to a rest/<group>/<slug>.md path", () => {
        const bundle = new OpenApiNormalizer().normalize(openapiPayload);
        const index = buildCanonicalIndex(bundle);
        const pathMap = buildOpenApiPathMap(bundle, index);
        expect(pathMap.get("rest:endpoint:GET:/widgets/{id}")).toBe("rest/widgets/widgets_retrieve.md");
    });

    it("maps a schema id to rest/schemas/<name>.md", () => {
        const bundle = new OpenApiNormalizer().normalize(openapiPayload);
        const index = buildCanonicalIndex(bundle);
        const pathMap = buildOpenApiPathMap(bundle, index);
        expect(pathMap.get("rest:schema:Widget")).toBe("rest/schemas/Widget.md");
    });
});

// ---------------------------------------------------------------------------
// buildVueDocgenPathMap
// ---------------------------------------------------------------------------

describe("buildVueDocgenPathMap", () => {
    it("maps a component id to vue/<name>.md", () => {
        const bundle = new VueDocgenNormalizer().normalize(vueDocgenPayload);
        const pathMap = buildVueDocgenPathMap(bundle);
        expect(pathMap.get("vue:component:Foo")).toBe("vue/Foo.md");
    });

    it("generates exactly one path-map entry per component (sub-page paths are added by the renderer)", () => {
        const bundle = new VueDocgenNormalizer().normalize(vueDocgenPayload);
        const pathMap = buildVueDocgenPathMap(bundle);
        expect(pathMap.size).toBe(1);
    });
});
