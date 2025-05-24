import viteConfig from "./vite.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default defineConfig((configEnv) =>
    mergeConfig(
        viteConfig(configEnv),
        defineConfig({
            test: {
                globals: true,
                environment: "jsdom",
                coverage: {
                    reportOnFailure: true,
                    provider: "istanbul",
                    include: ["lib"],
                    exclude: [
                        "lib/theme", // mostly static configuration, even though contained in .js files
                        "lib/utils/dev.js", // only used in dev mode, basically a no-op
                        "lib/utils/fieldMappings.js", // static configuration
                        "lib/utils/primevueConsts.js", // copy of primevue constants
                        "lib/utils/objectGridSkeletonProps.js", // configuration for object grid skeletons
                    ],
                    reporter: ["text", "json-summary", "html", "lcov"],
                },
                setupFiles: ["tests/unit/vitest-setup.js"],
            },
        }),
    ),
);
