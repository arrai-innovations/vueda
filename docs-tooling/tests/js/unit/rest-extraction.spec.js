import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));
let tempDir;

beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "vueda-rest-extraction-"));
    // Exercise the real CLI and its child-process boundary without starting Django.
    await writeFile(
        path.join(tempDir, "uv"),
        `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.writeFileSync(process.env.CAPTURE_PATH, JSON.stringify({ args, cwd: process.cwd(), settings: process.env.DJANGO_SETTINGS_MODULE }));
if (process.env.INVALID_SCHEMA === "true" && args.includes("--validate")) {
    console.error("SchemaValidationError: invalid fixture");
    process.exit(23);
}
fs.writeFileSync(args[args.indexOf("--file") + 1], "{}");
`,
        { mode: 0o755 },
    );
});

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});

function extract(env = {}) {
    return execFileAsync(
        process.execPath,
        [path.join(packageRoot, "bin/docs-tooling.js"), "extract", "--target", "rest", "--out-dir", tempDir],
        {
            env: {
                ...process.env,
                PATH: tempDir + path.delimiter + process.env.PATH,
                CAPTURE_PATH: path.join(tempDir, "invocation.json"),
                ...env,
            },
        },
    );
}

describe("bin/docs-tooling.js REST extraction", () => {
    it("validates the schema under docs settings before accepting its output", async () => {
        await extract();
        const invocation = JSON.parse(await readFile(path.join(tempDir, "invocation.json"), "utf8"));
        expect(invocation.args).toEqual([
            "run",
            "--no-sync",
            "python",
            "manage.py",
            "spectacular",
            "--format",
            "openapi-json",
            "--validate",
            "--file",
            path.join(tempDir, "openapi.json"),
        ]);
        expect(invocation.cwd).toBe(path.resolve(packageRoot, "../server"));
        expect(invocation.settings).toBe("doc_settings");
        expect(JSON.parse(await readFile(path.join(tempDir, "openapi.json"), "utf8"))).toEqual({});
    });

    it("fails extraction when schema validation fails", async () => {
        await expect(extract({ INVALID_SCHEMA: "true" })).rejects.toMatchObject({
            code: 1,
            stderr: expect.stringContaining("SchemaValidationError: invalid fixture"),
        });
    });
});
