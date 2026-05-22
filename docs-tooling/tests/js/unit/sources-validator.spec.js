import {
    filterDiagnosticsByFiles,
    formatDiagnostic,
    validateThemeKeysPayload,
} from "../../../js/validators/sources.js";
import { describe, expect, it } from "vitest";

const entry = (component, slot, overrides = {}) => ({
    family: "controls",
    component,
    slot,
    kind: component.startsWith("_") ? "primitive" : "key",
    valueShape: "static",
    staticClass: [],
    callbackSource: null,
    composes: [],
    description: null,
    group: null,
    source: { file: "client/lib/theme/vueda-tailwind/controls/index.js", line: 10, column: 5 },
    ...overrides,
});

describe("validateThemeKeysPayload", () => {
    it("returns no diagnostics for a clean payload", () => {
        const payload = {
            entries: [entry("_Base", "root"), entry("Button", "root", { composes: ["_Base.root"] })],
        };
        expect(validateThemeKeysPayload(payload)).toEqual([]);
    });

    it("flags composes refs to a missing target as error", () => {
        const payload = { entries: [entry("Button", "root", { composes: ["_Missing.root"] })] };
        const diags = validateThemeKeysPayload(payload);
        expect(diags).toHaveLength(1);
        expect(diags[0].code).toBe("themeKeys/unresolved-composes-ref");
        expect(diags[0].message).toMatch(/no component "_Missing"/);
    });

    it("flags composes refs to an existing target but missing slot as error", () => {
        const payload = {
            entries: [entry("_Base", "root"), entry("X", "root", { composes: ["_Base.label"] })],
        };
        const diags = validateThemeKeysPayload(payload);
        expect(diags).toHaveLength(1);
        expect(diags[0].code).toBe("themeKeys/unresolved-composes-ref");
        expect(diags[0].message).toMatch(/has no slot "label"/);
    });

    it("flags malformed composes refs (no dot) as error", () => {
        const payload = { entries: [entry("X", "root", { composes: ["nodot"] })] };
        const diags = validateThemeKeysPayload(payload);
        expect(diags[0].code).toBe("themeKeys/malformed-composes-ref");
    });

    it("ignores callback slots with no composes refs", () => {
        const payload = {
            entries: [entry("X", "root", { valueShape: "callback", callbackSource: "() => ({})" })],
        };
        expect(validateThemeKeysPayload(payload)).toEqual([]);
    });

    it("returns empty when payload has no entries", () => {
        expect(validateThemeKeysPayload({})).toEqual([]);
        expect(validateThemeKeysPayload({ entries: [] })).toEqual([]);
    });
});

describe("filterDiagnosticsByFiles", () => {
    const diags = [
        { severity: "error", code: "x", file: "a.js", line: 1, message: "" },
        { severity: "error", code: "x", file: "b.js", line: 2, message: "" },
    ];

    it("returns input unchanged when files is undefined", () => {
        expect(filterDiagnosticsByFiles(diags, undefined)).toEqual(diags);
    });

    it("returns input unchanged when files is empty", () => {
        expect(filterDiagnosticsByFiles(diags, [])).toEqual(diags);
    });

    it("filters to the given file set", () => {
        expect(filterDiagnosticsByFiles(diags, ["b.js"])).toEqual([diags[1]]);
    });
});

describe("formatDiagnostic", () => {
    it("includes file:line, severity, code, and message", () => {
        const out = formatDiagnostic({
            severity: "error",
            code: "x/y",
            file: "a.js",
            line: 5,
            message: "boom",
        });
        expect(out).toBe("a.js:5: [error x/y] boom");
    });

    it("omits :line when line is 0", () => {
        const out = formatDiagnostic({ severity: "warn", code: "x/y", file: "a.js", line: 0, message: "m" });
        expect(out).toBe("a.js: [warn x/y] m");
    });
});
