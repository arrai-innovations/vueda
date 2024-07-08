import strip from "@rollup/plugin-strip";
import Vue from "@vitejs/plugin-vue";
import fs from "fs";
import { URL, fileURLToPath } from "url";
import { defineConfig } from "vite";
import circleDependency from "vite-plugin-circular-dependency";

export default () => {
    let https;
    if (fs.existsSync("/etc/pki/tls/private/arrai.com.key")) {
        https = {
            key: fs.readFileSync("/etc/pki/tls/private/arrai.com.key"),
            cert: fs.readFileSync("/etc/pki/tls/certs/arrai.com.crt"),
        };
    }
    return defineConfig({
        plugins: [Vue(), circleDependency({})],
        build: {
            rollupOptions: {
                plugins: [
                    strip({
                        // Remove attributes with the "data-qa" prefix
                        pattern: /data-qa-.*/g,
                    }),
                ],
            },
        },
        resolve: {
            server: {
                host: true,
                port: 8880,
                strictPort: true,
                https,
            },
            preview: {
                host: true,
                port: 8880,
                strictPort: true,
                https,
            },
            alias: {
                "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
            },
        },
    });
};
