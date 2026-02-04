import path from "node:path";

export function getRepoRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
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
