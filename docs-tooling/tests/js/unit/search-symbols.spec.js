import { main, searchSymbols } from "../../../../skills/using-vueda/scripts/search-symbols.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const symbols = [
    {
        id: "js:function:module#useModelInfoExtra",
        name: "useModelInfoExtra",
        url: "https://vueda.dev/v3/reference/api/js/extra.md",
    },
    {
        id: "js:param:module#useModelInfo:model",
        name: "useModelInfo.model",
        url: "https://vueda.dev/v3/reference/api/js/info.md#param-model",
    },
    {
        id: "py:method:Model.useModelInfo",
        name: "Model.useModelInfo",
        url: "https://vueda.dev/v3/reference/api/py/Model.md#useModelInfo",
    },
    {
        id: "js:function:module#useModelInfo",
        name: "useModelInfo",
        url: "https://vueda.dev/v3/reference/api/js/info.md",
    },
    {
        id: "js:function:other#useModelInfo",
        name: "useModelInfo",
        url: "https://vueda.dev/v3/reference/api/js/other.md",
    },
    {
        id: "css-token:radius",
        name: "--radius",
        url: "https://vueda.dev/v3/reference/theming/tokens/base.md#css-token-radius",
    },
];

afterEach(() => vi.unstubAllGlobals());

function mockIndex(index = { version: 1, symbols }) {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => index });
    vi.stubGlobal("fetch", fetch);
    return fetch;
}

describe("skill symbol lookup", () => {
    it("ranks exact names and qualified identifiers above partial matches without losing duplicates", () => {
        const result = searchSymbols(symbols, "USEMODELINFO");
        expect(result.total).toBe(5);
        expect(result.matches.slice(0, 3).map(({ id }) => id)).toEqual([
            "js:function:module#useModelInfo",
            "js:function:other#useModelInfo",
            "py:method:Model.useModelInfo",
        ]);
        expect(searchSymbols(symbols, "js:function:other#useModelInfo").matches).toEqual([symbols[4]]);
    });

    it("filters namespaces, bounds output, and preserves member anchors", () => {
        const result = searchSymbols(symbols, "useModelInfo", { language: "js", limit: 2 });
        expect(result.total).toBe(4);
        expect(result.matches).toHaveLength(2);
        expect(searchSymbols(symbols, "model", { language: "py" }).matches).toEqual([symbols[2]]);
        expect(searchSymbols(symbols, "useModelInfo.model").matches).toEqual([symbols[1]]);
        expect(searchSymbols(symbols, "radius", { language: "theme" }).matches).toEqual([symbols[5]]);
        expect(searchSymbols(symbols, "not-a-symbol")).toEqual({ total: 0, matches: [] });
    });

    it("prefers the exact case when a function and type share a name", () => {
        const type = { ...symbols[3], id: "js:type:module#UseModelInfo", name: "UseModelInfo" };
        const entries = [...symbols, type];
        expect(searchSymbols(entries, "UseModelInfo").matches[0]).toEqual(type);
        expect(searchSymbols(entries, "useModelInfo").matches[0]).toEqual(symbols[3]);
    });

    it("downloads the selected major and returns only the requested results", async () => {
        const fetch = mockIndex();
        const result = JSON.parse(await main(["--major", "3", "--language", "js", "--limit", "1", "useModelInfo"]));
        expect(fetch).toHaveBeenCalledWith(
            "https://vueda.dev/v3/symbols.json",
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(result).toMatchObject({
            major: 3,
            query: "useModelInfo",
            total: 4,
            truncated: true,
            matches: [symbols[3]],
        });
        const version4 = symbols.map((entry) => ({ ...entry, url: entry.url.replace("/v3/", "/v4/") }));
        const fetch4 = mockIndex({ version: 1, symbols: version4 });
        await main(["--major", "4", "useModelInfo"]);
        expect(fetch4).toHaveBeenCalledWith("https://vueda.dev/v4/symbols.json", expect.anything());
    });

    it("accepts CSS property names after the option separator and reports empty results", async () => {
        mockIndex();
        expect(JSON.parse(await main(["--major", "3", "--language", "theme", "--", "--radius"])).matches).toEqual([
            symbols[5],
        ]);
        expect(JSON.parse(await main(["--major", "3", "absent"]))).toMatchObject({
            total: 0,
            truncated: false,
            matches: [],
        });
    });

    it.each([
        ["useModelInfo"],
        ["--major", "3.1", "useModelInfo"],
        ["--major", "0", "useModelInfo"],
        ["--major", "3", "--language", "unknown", "useModelInfo"],
        ["--major", "3", "--limit", "0", "useModelInfo"],
        ["--major", "3", "--limit", "51", "useModelInfo"],
        ["--major", "3", "--limit", "1.5", "useModelInfo"],
        ["--major", "3"],
    ])("rejects invalid arguments before fetching: %j", async (...args) => {
        const fetch = mockIndex();
        await expect(main(args)).rejects.toThrow();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("reports failed downloads with a same-major navigation fallback", async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
        vi.stubGlobal("fetch", fetch);
        await expect(main(["--major", "2", "Widget"])).rejects.toThrow(
            "HTTP 404. Follow https://vueda.dev/v2/llms.txt",
        );
        fetch.mockRejectedValue(new Error("network unavailable"));
        await expect(main(["--major", "3", "Widget"])).rejects.toThrow(
            "network unavailable. Follow https://vueda.dev/v3/llms.txt",
        );
    });

    it.each([
        { version: 2, symbols },
        { version: 1, symbols: [{ id: "missing-fields" }] },
        { version: 1, symbols: [{ ...symbols[0], url: "https://vueda.dev/v2/old.md" }] },
        null,
    ])("rejects unsupported or malformed indexes: %j", async (index) => {
        mockIndex(index);
        await expect(main(["--major", "3", "Widget"])).rejects.toThrow("Unsupported or invalid symbol index");
    });

    it("runs as a standalone script outside the repository without dependencies", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vueda-skill-"));
        try {
            const script = path.join(dir, "search-symbols.mjs");
            fs.copyFileSync(
                fileURLToPath(new URL("../../../../skills/using-vueda/scripts/search-symbols.mjs", import.meta.url)),
                script,
            );
            const output = execFileSync(process.execPath, [script, "--help"], { cwd: dir, encoding: "utf8" });
            expect(output).toContain("--major");
            expect(output).toContain("--language");
            expect(() =>
                execFileSync(process.execPath, [script, "--major", "3"], { cwd: dir, stdio: "pipe" }),
            ).toThrow();
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
