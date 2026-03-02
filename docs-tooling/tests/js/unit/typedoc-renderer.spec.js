import { TypeDocNormalizer } from "../../../js/normalizers/typedoc.js";
import { renderTypeDocBundle } from "../../../js/renderers/typedoc.js";
import { describe, expect, it } from "vitest";

const payload = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "math",
            kind: 2,
            comment: { summary: [{ kind: "text", text: "Math utilities." }] },
            children: [
                {
                    id: 2,
                    name: "sum",
                    kind: 64,
                    comment: { summary: [{ kind: "text", text: "Add two numbers." }] },
                    signatures: [
                        {
                            id: 3,
                            name: "sum",
                            parameters: [
                                { id: 4, name: "a", flags: {}, type: { type: "intrinsic", name: "number" } },
                                { id: 5, name: "b", flags: {}, type: { type: "intrinsic", name: "number" } },
                            ],
                            type: { type: "intrinsic", name: "number" },
                        },
                    ],
                    sources: [{ fileName: "client/lib/math.js", line: 1 }],
                },
            ],
        },
    ],
};

function buildOutputs() {
    const bundle = new TypeDocNormalizer().normalize(payload);
    return renderTypeDocBundle(bundle);
}

describe("renderTypeDocBundle", () => {
    it("produces output entries only for file paths without # anchors", () => {
        const outputs = buildOutputs();
        for (const filePath of outputs.keys()) {
            expect(filePath).not.toContain("#");
        }
    });

    it("includes a page for the module and one for the function", () => {
        const outputs = buildOutputs();
        const keys = [...outputs.keys()];
        expect(keys.some((k) => k === "js/math.md")).toBe(true);
        expect(keys.some((k) => k === "js/math/functions/sum.md")).toBe(true);
    });

    it("module page contains a heading for the module name", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math.md");
        expect(page).toBeDefined();
        expect(page).toContain("# math");
    });

    it("function page contains the function name in a heading", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math/functions/sum.md");
        expect(page).toBeDefined();
        expect(page).toContain("sum");
    });

    it("function page renders the parameter names", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math/functions/sum.md");
        expect(page).toContain("a");
        expect(page).toContain("b");
    });

    it("function page renders the return type", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math/functions/sum.md");
        expect(page).toContain("number");
    });

    it("each page frontmatter includes id, kind, and source fields", () => {
        const outputs = buildOutputs();
        for (const content of outputs.values()) {
            expect(content).toContain("id:");
            expect(content).toContain("kind:");
            expect(content).toContain('source: "typedoc"');
        }
    });
});
