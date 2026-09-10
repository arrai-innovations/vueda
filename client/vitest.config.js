import viteConfig from "./vite.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default defineConfig((configEnv) => {
    const testViteConfig = viteConfig(configEnv);
    // Unit tests need Vue SFC transforms, but not Tailwind generation or the
    // Rollup-only circular dependency check from the development/build config.
    testViteConfig.plugins = testViteConfig.plugins.flat().filter((plugin) => plugin?.name === "vite:vue");

    return mergeConfig(
        testViteConfig,
        defineConfig({
            test: {
                watch: false,
                globals: true,
                environment: "jsdom",
                coverage: {
                    reportOnFailure: true,
                    provider: "istanbul",
                    all: true,
                    include: ["lib/**/*.js", "lib/**/*.ts", "lib/**/*.vue"],
                    exclude: [
                        "lib/theme", // mostly static configuration, even though contained in .js files
                        "lib/utils/dev.js", // only used in dev mode, basically a no-op
                        "lib/utils/fieldMappings.js", // static configuration
                    ],
                    reporter: ["text", "json-summary", "html", "lcov"],
                },
                setupFiles: ["tests/unit/vitest-setup.js"],
            },
        }),
    );
});
