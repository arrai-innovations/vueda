// @vitest-environment node
import vue from "@vitejs/plugin-vue";
import { vuedaViteConfig } from "@vueda/vite.js";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const clientRoot = path.resolve(import.meta.dirname, "../../../");
const routerSource = path.join(clientRoot, "lib/views/ViewActionRouter.vue");

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
    ])("transforms action view imports from a %s", async (_, packagePath) => {
        fixtureRoot = fs.mkdtempSync(path.join(clientRoot, ".action-router-vite-"));
        const views = path.join(fixtureRoot, "src/views");
        fs.mkdirSync(views, { recursive: true });
        fs.writeFileSync(
            path.join(views, "ViewActionCatalogInventoryrecordReplenish.vue"),
            "<template>Custom action</template>",
        );

        const routerPath = packagePath
            ? path.join(fixtureRoot, "node_modules", packagePath, "lib/views/ViewActionRouter.vue")
            : routerSource;
        if (packagePath) {
            fs.mkdirSync(path.dirname(routerPath), { recursive: true });
            fs.copyFileSync(routerSource, routerPath);
        }

        const vueda = vuedaViteConfig({
            root: fixtureRoot,
            enableDedupe: false,
            enableRuntimeAliases: false,
            extraAliases: { "@": path.join(fixtureRoot, "src"), "@vueda": path.join(clientRoot, "lib") },
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
            const transformed = await server.transformRequest(`/@fs${routerPath}`);
            expect(transformed.code).toContain("__variableDynamicImportRuntimeHelper");
            expect(transformed.code).toContain("ViewActionCatalogInventoryrecordReplenish.vue");
            expect(transformed.code).not.toContain("`@/views/");
        } finally {
            await server.close();
        }
    });

    it("leaves the router excluded when the consumer has no action view alias", () => {
        const config = vuedaViteConfig({ enableDedupe: false });
        expect(config.build).toBeUndefined();
    });
});
