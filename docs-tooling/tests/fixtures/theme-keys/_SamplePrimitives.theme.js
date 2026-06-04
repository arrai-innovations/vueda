import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    _ButtonBase: {
        root: {
            class: ["inline-flex items-center"],
        },
    },
    _ButtonGhost: {
        root: { class: "hover:bg-accent" },
    },
});
