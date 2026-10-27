/**
 * Builds the mockup kit: the HTML snapshots and the stylesheet that they use.
 *
 * Usage: node scripts/mockup-kit/build.mjs <output-dir>
 *
 * 1. Compile the kit stylesheet on its own. Its utilities layer tells the
 *    snapshot step which class tokens are utilities.
 * 2. Render the snapshots under vitest. That step names the long utility
 *    strings and writes the `@apply` rules that define the names.
 * 3. Compile the stylesheet again with those rules, into the output directory.
 */
import { compileCss } from "./compileCss.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [outArg] = process.argv.slice(2);
if (!outArg) {
    console.error("Usage: node scripts/mockup-kit/build.mjs <output-dir>");
    process.exit(2);
}
const out = resolve(outArg);
const clientDir = fileURLToPath(new URL("../..", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "vueda-mockup-kit-"));

try {
    mkdirSync(out, { recursive: true });
    const baseCss = join(work, "base.css");
    const componentsCss = join(work, "components.css");
    await compileCss(baseCss);

    const result = spawnSync(
        "npx",
        ["--no-install", "vitest", "run", "--config", "scripts/mockup-kit/vitest.config.js", "--reporter=dot"],
        {
            cwd: clientDir,
            stdio: "inherit",
            env: {
                ...process.env,
                // The first compile ran `vite build`, which set NODE_ENV to
                // production in this process; vitest needs its own mode.
                NODE_ENV: "test",
                MOCKUP_KIT_OUT: out,
                MOCKUP_KIT_BASE_CSS: baseCss,
                MOCKUP_KIT_COMPONENTS_CSS: componentsCss,
            },
        },
    );
    if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
    } else {
        await compileCss(join(out, "vueda-mockups.css"), [componentsCss]);
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}
