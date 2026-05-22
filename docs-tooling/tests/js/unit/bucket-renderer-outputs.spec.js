import { bucketRendererOutputs } from "../../../js/utils/bucket-renderer-outputs.js";
import { describe, expect, it } from "vitest";

describe("bucketRendererOutputs", () => {
    it("returns empty buckets for no items", () => {
        const { combinedByDir, skipIndexDirs } = bucketRendererOutputs([]);
        expect(combinedByDir.size).toBe(0);
        expect(skipIndexDirs.size).toBe(0);
    });

    it("groups outputs by output dir", () => {
        const items = [
            { source: "typedoc", outputDir: "/a", outputs: new Map([["x.md", "X"]]) },
            { source: "vue-docgen", outputDir: "/a", outputs: new Map([["y.md", "Y"]]) },
            { source: "css-tokens", outputDir: "/b", outputs: new Map([["z.md", "Z"]]) },
        ];
        const { combinedByDir } = bucketRendererOutputs(items);
        expect(combinedByDir.get("/a")).toEqual(
            new Map([
                ["x.md", "X"],
                ["y.md", "Y"],
            ]),
        );
        expect(combinedByDir.get("/b")).toEqual(new Map([["z.md", "Z"]]));
    });

    it("later sources to the same dir overwrite earlier files with the same path", () => {
        const items = [
            { source: "a", outputDir: "/a", outputs: new Map([["x.md", "first"]]) },
            { source: "b", outputDir: "/a", outputs: new Map([["x.md", "second"]]) },
        ];
        const { combinedByDir } = bucketRendererOutputs(items);
        expect(combinedByDir.get("/a").get("x.md")).toBe("second");
    });

    it("marks dirs whose source is in skipIndexFor", () => {
        const items = [
            { source: "vue-docgen", outputDir: "/a", outputs: new Map() },
            { source: "css-tokens", outputDir: "/b", outputs: new Map() },
            { source: "theme-keys", outputDir: "/b", outputs: new Map() },
        ];
        const { skipIndexDirs } = bucketRendererOutputs(items, {
            skipIndexFor: new Set(["css-tokens", "theme-keys"]),
        });
        expect(skipIndexDirs.has("/a")).toBe(false);
        expect(skipIndexDirs.has("/b")).toBe(true);
    });

    it("marks the dir as skip-index even when an indexed source also writes to it", () => {
        const items = [
            { source: "vue-docgen", outputDir: "/shared", outputs: new Map() },
            { source: "theme-keys", outputDir: "/shared", outputs: new Map() },
        ];
        const { skipIndexDirs } = bucketRendererOutputs(items, {
            skipIndexFor: new Set(["theme-keys"]),
        });
        expect(skipIndexDirs.has("/shared")).toBe(true);
    });

    it("treats omitted skipIndexFor as no skips", () => {
        const items = [{ source: "css-tokens", outputDir: "/a", outputs: new Map() }];
        const { skipIndexDirs } = bucketRendererOutputs(items);
        expect(skipIndexDirs.size).toBe(0);
    });
});
