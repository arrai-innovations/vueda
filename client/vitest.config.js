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
                    include: ["lib"],
                    exclude: [
                        "lib/utils/dev.js",
                        "lib/utils/fieldMappings.js",
                        "lib/utils/primevueConsts.js",
                        "lib/utils/objectGridSkeletonProps.js",
                    ],
                    reporter: ["text", "json-summary", "html"],
                },
                setupFiles: ["tests/unit/vitest-setup.js"],
            },
        }),
    ),
);
