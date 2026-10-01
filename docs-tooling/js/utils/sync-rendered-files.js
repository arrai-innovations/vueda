/**
 * Write rendered reference pages in place, touching only files whose contents change.
 *
 * The docs dev server watches the generated trees. Deleting and rewriting every page on each
 * render makes it reprocess thousands of pages that did not change, so a render writes a file
 * only when its contents differ, and removes only the stale files under the roots it manages.
 */
import fs from "node:fs";
import path from "node:path";

async function readIfExists(target) {
    try {
        return await fs.promises.readFile(target, "utf-8");
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }
        throw error;
    }
}

async function listFiles(root) {
    let stat;
    try {
        stat = await fs.promises.stat(root);
    } catch (error) {
        if (error.code === "ENOENT") {
            return [];
        }
        throw error;
    }
    if (!stat.isDirectory()) {
        return [root];
    }
    const files = [];
    for (const entry of await fs.promises.readdir(root, { withFileTypes: true })) {
        files.push(...(await listFiles(path.join(root, entry.name))));
    }
    return files;
}

async function removeEmptyDirs(dir, stopAt) {
    let current = dir;
    while (current.startsWith(stopAt) && current !== stopAt) {
        const entries = await fs.promises.readdir(current).catch(() => null);
        if (!entries || entries.length) {
            return;
        }
        await fs.promises.rmdir(current);
        current = path.dirname(current);
    }
}

/**
 * Write each rendered file whose contents differ from the file on disk, then remove stale files.
 *
 * @param {Map<string, Map<string, string>>} outputsByDir - Rendered contents keyed by output
 *   directory, then by path relative to that directory.
 * @param {object} [options]
 * @param {string[]} [options.pruneRoots] - Absolute directories or files this render owns. A file
 *   under one of them that the render did not produce is deleted, along with directories it
 *   leaves empty. Omit to write without deleting anything.
 * @returns {Promise<{written: number, unchanged: number, removed: number}>} File counts.
 */
export async function syncRenderedFiles(outputsByDir, { pruneRoots = [] } = {}) {
    const produced = new Set();
    let written = 0;
    let unchanged = 0;
    for (const [dir, outputs] of outputsByDir.entries()) {
        for (const [filename, contents] of outputs.entries()) {
            const target = path.resolve(dir, filename);
            produced.add(target);
            if ((await readIfExists(target)) === contents) {
                unchanged += 1;
                continue;
            }
            await fs.promises.mkdir(path.dirname(target), { recursive: true });
            await fs.promises.writeFile(target, contents);
            written += 1;
        }
    }

    let removed = 0;
    for (const root of pruneRoots.map((entry) => path.resolve(entry))) {
        for (const file of await listFiles(root)) {
            if (produced.has(file)) {
                continue;
            }
            await fs.promises.unlink(file);
            removed += 1;
            await removeEmptyDirs(path.dirname(file), root);
        }
    }
    return { written, unchanged, removed };
}
