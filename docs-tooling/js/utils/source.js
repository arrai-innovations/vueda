import path from "node:path";
import { fileURLToPath } from "node:url";

export function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

export function normalizeSourceFile(filePath, repoRoot = getRepoRoot()) {
  if (!filePath || typeof filePath !== "string") {
    return undefined;
  }

  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(repoRoot, filePath);

  const relative = path.relative(repoRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }

  return relative;
}
