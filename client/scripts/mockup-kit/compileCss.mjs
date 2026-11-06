/**
 * Compiles the mockup kit stylesheet with Tailwind through Vite, using the
 * client's own Tailwind and theme packages.
 */
import tailwindcss from "@tailwindcss/vite";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

/**
 * Compile `kit.css`, plus any extra stylesheets, into one minified file.
 *
 * The entry file has to sit in this folder so that `@import "tailwindcss"`
 * resolves from the client package.
 *
 * @param {string} outFile - Path that the compiled CSS is written to.
 * @param {string[]} [extraImports] - Absolute paths of stylesheets to compile with the kit.
 * @returns {Promise<void>}
 */
export async function compileCss(outFile, extraImports = []) {
    const entry = join(here, ".kit-entry.css");
    const outDir = mkdtempSync(join(tmpdir(), "vueda-mockup-css-"));
    writeFileSync(entry, ['@import "./kit.css";', ...extraImports.map((path) => `@import "${path}";`)].join("\n"));
    try {
        await build({
            configFile: false,
            root: here,
            logLevel: "warn",
            plugins: [tailwindcss()],
            build: { outDir, emptyOutDir: true, rollupOptions: { input: entry } },
        });
        const assets = join(outDir, "assets");
        const [css] = readdirSync(assets).filter((name) => name.endsWith(".css"));
        writeFileSync(outFile, readFileSync(join(assets, css)));
    } finally {
        rmSync(entry, { force: true });
        rmSync(outDir, { recursive: true, force: true });
    }
}
