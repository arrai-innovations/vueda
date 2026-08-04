import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    CalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root"],
            class: ["size-8", "p-0", { "bg-primary": true }],
        },
    },
});
