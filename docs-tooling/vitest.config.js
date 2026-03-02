import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/js/**/*.test.js", "tests/js/**/*.spec.js"],
        coverage: {
            reportOnFailure: true,
            provider: "istanbul",
            all: true,
            include: ["js/**/*.js", "bin/docs-tooling.js"],
            reporter: ["text", "json-summary", "html", "lcov"],
        },
    },
});
