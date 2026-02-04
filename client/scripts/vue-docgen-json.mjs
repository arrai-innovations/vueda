import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const clientRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(clientRoot, '..');

const inputDir = path.resolve(clientRoot, process.argv[2] ?? 'lib');
const outputFile = path.resolve(
  repoRoot,
  process.argv[3] ?? 'docs/.generated/api/client/vue-docgen.json'
);

const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.vitepress']);

const walkVueFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) {
      return [];
    }
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkVueFiles(entryPath);
    }
    if (entry.isFile() && entry.name.endsWith('.vue')) {
      return [entryPath];
    }
    return [];
  });
};

const main = async () => {
  const { parse } = await import('vue-docgen-api');
  const files = walkVueFiles(inputDir);
  const docs = [];

  for (const filePath of files) {
    const doc = await parse(filePath);
    docs.push({
      file: path.relative(repoRoot, filePath),
      ...doc,
    });
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(docs, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${docs.length} docs to ${outputFile}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
