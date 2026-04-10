import viteConfig from "./vite.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default defineConfig((configEnv) =>
    mergeConfig(
        viteConfig(configEnv),
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
    ),
);
