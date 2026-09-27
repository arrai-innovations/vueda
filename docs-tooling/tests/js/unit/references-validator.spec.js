import { addExternalIds, scanFileRefs } from "../../../js/validators/references.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
