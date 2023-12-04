import Vue from "@vitejs/plugin-vue";
import { URL, fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        coverage: {
            reporter: ["text", "json-summary", "html"],
        },
    },
    resolve: {
        alias: {
            "@vueda": fileURLToPath(new URL("./lib", import.meta.url)),
        },
    }
});
