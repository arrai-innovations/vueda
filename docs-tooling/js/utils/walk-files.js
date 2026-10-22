import fs from "node:fs";
import path from "node:path";

/** Recursively list file paths. Return an empty array when the directory is missing. */
export const walkFiles = (dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return walkFiles(entryPath);
        }
        return [entryPath];
    });
};
