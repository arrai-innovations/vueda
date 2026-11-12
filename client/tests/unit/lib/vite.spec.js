// @vitest-environment node
import vue from "@vitejs/plugin-vue";
import { vuedaViteConfig } from "@vueda/vite.js";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const clientRoot = path.resolve(import.meta.dirname, "../../../");
const overridesSource = path.join(clientRoot, "lib/utils/projectViewOverrides.js");

/**
 * @param {string} fixtureRoot
 * @param {string|null} packagePath
 * @param {object} extraAliases
 * @returns {Promise<string>}
 */
const transformProjectViewList = async (fixtureRoot, packagePath, extraAliases = {}) => {
    const overridesPath = packagePath
        ? path.join(fixtureRoot, "node_modules", packagePath, "lib/utils/projectViewOverrides.js")
        : overridesSource;
    if (packagePath) {
        fs.mkdirSync(path.dirname(overridesPath), { recursive: true });
        fs.copyFileSync(overridesSource, overridesPath);
    }
    const vueda = vuedaViteConfig({
        root: fixtureRoot,
        enableDedupe: false,
        enableRuntimeAliases: false,
        extraAliases: { "@vueda": path.join(clientRoot, "lib"), ...extraAliases },
    });
    const server = await createServer({
        root: fixtureRoot,
        configFile: false,
        plugins: [vue()],
        ...vueda,
        optimizeDeps: { noDiscovery: true },
        server: { fs: { allow: [clientRoot] }, middlewareMode: true },
    });
    try {
        return (await server.transformRequest(`/@fs${overridesPath}`)).code;
    } finally {
        await server.close();
    }
};

/**
 * @param {string} viewsDir
 * @returns {void}
 */
const writeProjectView = (viewsDir) => {
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(
        path.join(viewsDir, "ViewActionCatalogInventoryrecordReplenish.vue"),
        "<template>Custom action</template>",
    );
};

describe("lib/vite.js", () => {
    let fixtureRoot;

    afterEach(() => {
        if (fixtureRoot) {
            fs.rmSync(fixtureRoot, { recursive: true, force: true });
            fixtureRoot = undefined;
        }
    });

    it.each([
        ["registry-style path", ".pnpm/@arrai-innovations+vueda@3.0.0/node_modules/@arrai-innovations/vueda"],
        ["file-style path", ".pnpm/@arrai-innovations+vueda@file+client/node_modules/@arrai-innovations/vueda"],
        ["direct checkout source", null],
    ])("lists the project's src/views files from a %s through the default @ alias", async (_, packagePath) => {
        fixtureRoot = fs.mkdtempSync(path.join(clientRoot, ".project-views-vite-"));
        writeProjectView(path.join(fixtureRoot, "src/views"));
        const code = await transformProjectViewList(fixtureRoot, packagePath);
        expect(code).toContain('import("/src/views/ViewActionCatalogInventoryrecordReplenish.vue")');
    });

    it("lists the project's view files from the directory that the project's @ alias names", async () => {
        fixtureRoot = fs.mkdtempSync(path.join(clientRoot, ".project-views-vite-"));
        writeProjectView(path.join(fixtureRoot, "main/views"));
        const code = await transformProjectViewList(fixtureRoot, null, { "@": path.join(fixtureRoot, "main") });
        expect(code).toContain('import("/main/views/ViewActionCatalogInventoryrecordReplenish.vue")');
    });

    it("lists no files for a project without a views directory", async () => {
        fixtureRoot = fs.mkdtempSync(path.join(clientRoot, ".project-views-vite-"));
        const code = await transformProjectViewList(fixtureRoot, null);
        expect(code).toContain("Object.assign({})");
    });

    it.each(["vue-router", "pinia"])("resolves the %s alias to the package's import entry", async (packageName) => {
        const packageDir = fs.realpathSync(path.join(clientRoot, "node_modules", packageName));
        const packageJson = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf-8"));
        const vueda = vuedaViteConfig({ root: clientRoot, enableDedupe: false });
        const server = await createServer({
            root: clientRoot,
            configFile: false,
            ...vueda,
            optimizeDeps: { noDiscovery: true },
            server: { middlewareMode: true },
        });
        try {
            const resolved = await server.pluginContainer.resolveId(packageName);
            expect(resolved.id).toBe(path.join(packageDir, packageJson.exports["."].import));
        } finally {
            await server.close();
        }
    });

    it("sets @ to the project's src directory", () => {
        const config = vuedaViteConfig({ root: "/project", enableDedupe: false });
        expect(config.resolve.alias["@"]).toBe(path.resolve("/project", "src"));
    });

    it("lets the project's @ alias replace the default", () => {
        const config = vuedaViteConfig({
            root: "/project",
            enableDedupe: false,
            extraAliases: { "@": "/project/main" },
        });
        expect(config.resolve.alias["@"]).toBe("/project/main");
    });
});
