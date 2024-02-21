import viteConfig from "./vite.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
    viteConfig(),
    defineConfig({
        test: {
            globals: true,
            environment: "jsdom",
            coverage: {
                reporter: ["text", "json-summary", "html"],
            },
            setupFiles: ["tests/unit/vitest-setup.js"],
        },
    }),
);
