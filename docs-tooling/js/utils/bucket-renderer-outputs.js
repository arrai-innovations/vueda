/**
 * Group per-source renderer outputs by their target output directory so mixed
 * sources writing to different roots don't clobber each other's index pages.
 *
 * @param {Array<{source: string, outputDir: string, outputs: Map<string, string>}>} items
 * @param {{skipIndexFor?: Set<string>}} [options]
 * @returns {{combinedByDir: Map<string, Map<string, string>>, skipIndexDirs: Set<string>}}
 */
export function bucketRendererOutputs(items, { skipIndexFor } = {}) {
    const combinedByDir = new Map();
    const skipIndexDirs = new Set();

    for (const { source, outputDir, outputs } of items) {
        if (!combinedByDir.has(outputDir)) {
            combinedByDir.set(outputDir, new Map());
        }
        const bucket = combinedByDir.get(outputDir);
        for (const [filePath, contents] of outputs.entries()) {
            bucket.set(filePath, contents);
        }
        if (skipIndexFor?.has(source)) {
            skipIndexDirs.add(outputDir);
        }
    }

    return { combinedByDir, skipIndexDirs };
}
