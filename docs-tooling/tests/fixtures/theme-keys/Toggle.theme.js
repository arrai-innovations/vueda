import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    Toggle: {
        root: {
            class: ({ size }) => ["inline-flex", { "h-9": size === "default", "h-7": size === "sm" }],
        },
    },
});
