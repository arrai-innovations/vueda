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
                    reporter: ["text", "json-summary", "html"],
                },
                setupFiles: ["tests/unit/vitest-setup.js"],
            },
        }),
    ),
);
