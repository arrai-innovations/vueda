import fs from "fs/promises";
import glob from "glob-promise";
import path from "path";

async function gatherIndexPaths(startDir) {
    const pattern = path.join(startDir, "**/index.js");
    const indexPaths = await glob(pattern);
    // filter out lib/index.js, we only want subdirectories
    const rootIndexJs = path.join(startDir, "index.js");
    return indexPaths.filter((indexPath) => indexPath !== rootIndexJs);
}

async function testExports(directory, importPath) {
    const importedModule = await import(importPath);
    const files = await fs.readdir(directory);
    const modules = files.filter((file) => (file.endsWith(".js") || file.endsWith(".vue")) && file !== "index.js");
    const exportedKeys = [];

    for (const module of modules) {
        const moduleExports = await import(path.join(directory, module));
        exportedKeys.push(...Object.keys(moduleExports).filter((key) => key !== "default"));

        // handle default export
        if (moduleExports.default) {
            exportedKeys.push(path.parse(module).name);
        }
    }

    const importedKeys = Object.keys(importedModule);
    importedKeys.sort();
    exportedKeys.sort();
    return [importedKeys, exportedKeys];
}

describe("lib/**/index.js", async () => {
    const indexPaths = await gatherIndexPaths("./lib");
    const allExportedKeys = [];
    indexPaths.forEach((indexPath) => {
        const directory = path.dirname(indexPath);
        const relativePath = path.relative(__dirname, indexPath);

        describe(`lib/${directory}/index.js`, () => {
            it(`should correctly export all modules`, async () => {
                const [importedKeys, exportedKeys] = await testExports(directory, relativePath);
                expect(importedKeys).toEqual(exportedKeys);
                allExportedKeys.push(...exportedKeys);
            });
        });
    });

    it("lib/index.js should export all modules", async () => {
        const libExports = await import(path.relative(__dirname, "lib/index.js"));
        const libKeys = Object.keys(libExports);
        expect(libKeys.sort()).toEqual(Array.from(allExportedKeys).sort());
    });

    it("index.js should export all modules", async () => {
        const indexExports = await import(path.relative(__dirname, "index.js"));
        const indexKeys = Object.keys(indexExports);
        expect(indexKeys.sort()).toEqual(Array.from(allExportedKeys).sort());
    });
});
