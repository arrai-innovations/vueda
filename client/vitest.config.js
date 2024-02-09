import Vue from "@vitejs/plugin-vue";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
    viteConfig(),
    defineConfig({
        plugins: [Vue()],
        test: {
            globals: true,
            environment: "jsdom",
            coverage: {
                reporter: ["text", "json-summary", "html"],
            },
            setupFiles: ["setup-tests.js"],
        },
    }),
);
