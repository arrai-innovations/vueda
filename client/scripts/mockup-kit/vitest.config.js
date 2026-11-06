import baseConfig from "../../vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

// Dates in the snapshots print in the process timezone and locale. Fixing both
// here, before vitest starts its workers, makes the output the same on every
// machine.
process.env.TZ = "UTC";
process.env.LC_ALL = "en_US.UTF-8";

export default defineConfig((configEnv) =>
    mergeConfig(baseConfig(configEnv), {
        // The docs fixtures resolve these from docs/; one copy keeps one app.
        resolve: { dedupe: ["vue", "pinia", "vue-router"] },
        test: {
            include: ["scripts/mockup-kit/**/*.gen.js"],
            coverage: { enabled: false },
        },
    }),
);
