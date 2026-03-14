import { buildCanonicalIndex } from "../../../js/utils/index-canonical.js";
import { describe, expect, it } from "vitest";

const makeBundle = () => ({
    nodes: [
        { id: "parent-1", kind: "module", name: "pkg", children: ["child-1"] },
        { id: "child-1", kind: "class", name: "Foo" },
    ],
    roots: ["parent-1"],
});

describe("buildCanonicalIndex", () => {
    it("byId contains all nodes", () => {
        const index = buildCanonicalIndex(makeBundle());
        expect(index.byId.has("parent-1")).toBe(true);
        expect(index.byId.has("child-1")).toBe(true);
        expect(index.byId.get("parent-1").name).toBe("pkg");
    });

    it("childrenOf maps parent id to array of child nodes", () => {
        const index = buildCanonicalIndex(makeBundle());
        const children = index.childrenOf.get("parent-1");
        expect(Array.isArray(children)).toBe(true);
        expect(children.length).toBe(1);
        expect(children[0].id).toBe("child-1");
    });

    it("childrenOf for a leaf node is an empty array", () => {
        const index = buildCanonicalIndex(makeBundle());
        expect(index.childrenOf.get("child-1")).toEqual([]);
    });

    it("parentOf maps child id to the parent node", () => {
        const index = buildCanonicalIndex(makeBundle());
        const parent = index.parentOf.get("child-1");
        expect(parent).toBeDefined();
        expect(parent.id).toBe("parent-1");
    });

    it("roots contains the root nodes in order", () => {
        const index = buildCanonicalIndex(makeBundle());
        expect(index.roots.length).toBe(1);
        expect(index.roots[0].id).toBe("parent-1");
    });

    it("handles an empty bundle without error", () => {
        const index = buildCanonicalIndex({ nodes: [], roots: [] });
        expect(index.byId.size).toBe(0);
        expect(index.roots).toEqual([]);
    });

    it("does not overwrite parentOf if a child appears under multiple parents", () => {
        const bundle = {
            nodes: [
                { id: "p1", kind: "module", name: "a", children: ["shared"] },
                { id: "p2", kind: "module", name: "b", children: ["shared"] },
                { id: "shared", kind: "class", name: "X" },
            ],
            roots: ["p1", "p2"],
        };
        const index = buildCanonicalIndex(bundle);
        // First parent encountered wins
        expect(index.parentOf.get("shared").id).toBe("p1");
    });
});
