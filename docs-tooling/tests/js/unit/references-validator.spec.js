import {
    addExternalIds,
    scanFileRefs,
    summarizeUnknownReferences,
    validateReferences,
} from "../../../js/validators/references.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("scanFileRefs", () => {
    it("finds the reference in a labeled link", () => {
        const refs = scanFileRefs("Send [queue items]{@term Queue Item (VDQ)} with [`Card`]{@api vue:component:Card}.");
        expect(refs).toEqual([
            { type: "term", value: "Queue Item (VDQ)", line: 1, column: 19 },
            { type: "api", value: "vue:component:Card", line: 1, column: 57 },
        ]);
    });
});

describe("addExternalIds", () => {
    it("adds each extracted upstream id, and nothing when the file is missing", () => {
        const dir = mkdtempSync(path.join(os.tmpdir(), "external-ids-"));
        const file = path.join(dir, "external-ids.json");
        writeFileSync(file, JSON.stringify({ "ext:mdn:Blob": { href: "https://mdn.test/Blob", title: "MDN: Blob" } }));

        expect([...addExternalIds(new Map(), file).entries()]).toEqual([["ext:mdn:Blob", "https://mdn.test/Blob"]]);
        expect(addExternalIds(new Map(), path.join(dir, "missing.json")).size).toBe(0);
    });
});

describe("validateReferences", () => {
    let tempDir;
    let apiRoot;
    let glossaryFile;
    let docsDir;

    const docFile = async (name, content) => {
        const filePath = path.join(docsDir, name);
        await writeFile(filePath, content);
        return filePath;
    };

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), "references-"));
        apiRoot = path.join(tempDir, "api");
        docsDir = path.join(tempDir, "docs");
        glossaryFile = path.join(tempDir, "glossary.md");
        await mkdir(apiRoot, { recursive: true });
        await mkdir(docsDir, { recursive: true });
        await writeFile(path.join(apiRoot, "known.md"), '---\nid: "py:class:known.Known"\n---\n\n# Known\n');
        await writeFile(glossaryFile, "# Glossary\n\n## Model Info\n\nText.\n");
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it("reports unknown ids and terms as errors by default", async () => {
        const file = await docFile(
            "page.md",
            [
                "{@api py:class:known.Known} and {@term Model Info}",
                "{@api py:class:missing.Missing}",
                "{@term Nope}",
            ].join("\n"),
        );

        const result = validateReferences({ files: [file], apiRoots: apiRoot, glossaryFile });

        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([
            {
                file,
                line: 2,
                message: 'Unknown API id "py:class:missing.Missing"',
                type: "api",
                value: "py:class:missing.Missing",
            },
            { file, line: 3, message: 'Unknown glossary term "Nope"', type: "term", value: "Nope" },
        ]);
    });

    it("reports unknown ids and terms as warnings with warnUnknown", async () => {
        const file = await docFile("page.md", ["[label]{@api py:class:missing.Missing}", "{@term Nope}"].join("\n"));

        const result = validateReferences({ files: [file], apiRoots: apiRoot, glossaryFile, warnUnknown: true });

        expect(result.errors).toEqual([]);
        expect(result.warnings.map(({ line, type, value }) => ({ line, type, value }))).toEqual([
            { line: 1, type: "api", value: "py:class:missing.Missing" },
            { line: 2, type: "term", value: "Nope" },
        ]);
    });

    it("reports nothing for known references with warnUnknown", async () => {
        const file = await docFile("page.md", "{@api py:class:known.Known} and {@term Model Info}");

        const result = validateReferences({ files: [file], apiRoots: apiRoot, glossaryFile, warnUnknown: true });

        expect(result).toMatchObject({ errors: [], warnings: [], apiIndexSize: 1, glossaryIndexSize: 1 });
    });
});

describe("summarizeUnknownReferences", () => {
    it("groups uses by reference with counts and sorted, distinct files", () => {
        const warnings = [
            { file: "b.md", type: "api", value: "py:class:a.A" },
            { file: "a.md", type: "api", value: "py:class:a.A" },
            { file: "b.md", type: "api", value: "py:class:a.A" },
            { file: "a.md", type: "term", value: "Nope" },
            { file: "c.md", type: "api", value: "js:function:b" },
        ];

        expect(summarizeUnknownReferences(warnings)).toEqual([
            { type: "api", value: "py:class:a.A", count: 3, files: ["a.md", "b.md"] },
            { type: "api", value: "js:function:b", count: 1, files: ["c.md"] },
            { type: "term", value: "Nope", count: 1, files: ["a.md"] },
        ]);
    });

    it("breaks count ties by value", () => {
        const warnings = [
            { file: "a.md", type: "api", value: "z" },
            { file: "a.md", type: "api", value: "m" },
        ];

        expect(summarizeUnknownReferences(warnings).map((entry) => entry.value)).toEqual(["m", "z"]);
    });

    it("returns an empty list for no warnings", () => {
        expect(summarizeUnknownReferences([])).toEqual([]);
    });
});
