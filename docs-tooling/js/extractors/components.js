/**
 * Vue SFC docs extraction via vue-docgen-api JSON output.
 */
import { Extractor } from "../core.js";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMulti } from "vue-docgen-api";

async function listVueFiles(rootDir) {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listVueFiles(fullPath)));
        } else if (entry.isFile() && entry.name.endsWith(".vue")) {
            files.push(fullPath);
        }
    }
    return files;
}

export class ComponentsExtractor extends Extractor {
    async extract({ outputPath, sourceDir = "client/lib" } = {}) {
        if (!outputPath) {
            throw new Error("outputPath is required");
        }

        const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
        const resolvedOutput = path.isAbsolute(outputPath) ? outputPath : path.join(repoRoot, outputPath);
        const resolvedSourceDir = path.isAbsolute(sourceDir) ? sourceDir : path.resolve(repoRoot, sourceDir);

        await mkdir(path.dirname(resolvedOutput), { recursive: true });

        const files = await listVueFiles(resolvedSourceDir);
        const payload = {
            sourceDir: path.relative(repoRoot, resolvedSourceDir),
            files: [],
        };

        for (const filePath of files) {
            const components = await parseMulti(filePath);
            payload.files.push({
                filePath: path.relative(repoRoot, filePath),
                components,
            });
        }

        await writeFile(resolvedOutput, JSON.stringify(payload, null, 2));

        return {
            outputPath: resolvedOutput,
        };
    }
}
