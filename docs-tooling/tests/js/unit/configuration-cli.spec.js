import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const exec = promisify(execFile);
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));
const cli = path.join(packageRoot, "bin/docs-tooling.js");
let tempDir;
let raw;

beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "vueda-configuration-"));
    const context = {
        source: { file: "server/vueda/core/default_settings.py", line: 1 },
        function: "get_defaults",
        conditions: [],
    };
    raw = {
        config: [{ name: "SECRET", accessor: "__call__", default: null, ...context }],
        definitions: [
            { name: "SECRET_KEY", path: ["SECRET_KEY"], expression: "env('SECRET')", operation: "=", ...context },
        ],
        reads: [],
        metadata: {
            config: { SECRET: { description: "Signing secret.", settings: ["SECRET_KEY"] } },
            settings: {},
            djangoExemptions: {},
        },
    };
    await writeFile(path.join(tempDir, "fixture.json"), JSON.stringify(raw));
    await writeFile(
        path.join(tempDir, "uv"),
        `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.writeFileSync(process.env.CAPTURE_PATH, JSON.stringify(args));
fs.copyFileSync(process.env.CONFIGURATION_FIXTURE, args[args.indexOf("--output") + 1]);
`,
        { mode: 0o755 },
    );
});

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});

function run(...args) {
    return exec(process.execPath, [cli, ...args], {
        env: {
            ...process.env,
            PATH: tempDir + path.delimiter + process.env.PATH,
            CAPTURE_PATH: path.join(tempDir, "args.json"),
            CONFIGURATION_FIXTURE: path.join(tempDir, "fixture.json"),
        },
    });
}

describe("configuration CLI integration", () => {
    it("extracts, normalizes, and renders into explicit paths without pruning authored files", async () => {
        await run("extract", "--target", "configuration", "--out-dir", tempDir);
        const args = JSON.parse(await readFile(path.join(tempDir, "args.json"), "utf8"));
        expect(args).toEqual([
            "run",
            "--no-sync",
            "python",
            path.join(packageRoot, "py/dump_configuration.py"),
            "--output",
            path.join(tempDir, "configuration.json"),
        ]);
        const canonical = path.join(tempDir, "canonical.json");
        await run(
            "normalize",
            "--source",
            "configuration",
            "--input",
            path.join(tempDir, "configuration.json"),
            "--output",
            canonical,
        );
        await writeFile(path.join(tempDir, "authored.md"), "Keep this page.\n");
        await run("render", "--source", "configuration", "--input", canonical, "--output", tempDir);
        expect(await readFile(path.join(tempDir, "configuration.md"), "utf8")).toContain("Signing secret.");
        expect(await readFile(path.join(tempDir, "authored.md"), "utf8")).toBe("Keep this page.\n");
        const { stdout } = await run("render", "--source", "configuration", "--input", canonical, "--output", tempDir);
        expect(stdout).toContain("0 written, 1 unchanged, 0 removed");
    });

    it("returns failure for an undocumented setting", async () => {
        raw.reads.push({
            name: "UNDOCUMENTED",
            fallback: null,
            access: "attribute",
            source: { file: "server/vueda/example.py", line: 2 },
        });
        await writeFile(path.join(tempDir, "fixture.json"), JSON.stringify(raw));
        await expect(
            run(
                "normalize",
                "--source",
                "configuration",
                "--input",
                path.join(tempDir, "fixture.json"),
                "--output",
                path.join(tempDir, "canonical.json"),
            ),
        ).rejects.toMatchObject({
            code: 1,
            stderr: expect.stringContaining("missing Django setting: UNDOCUMENTED"),
        });
    });
});
