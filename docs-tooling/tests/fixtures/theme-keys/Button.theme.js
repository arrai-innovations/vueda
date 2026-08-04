import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Primary button surface used across action contexts.
     */
    Button: {
        root: ({ variant }) => ({
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: ["px-2"],
        }),
        /**
         * Optional decorative icon slot.
         */
        icon: {
            class: ["size-4"],
        },
    },
});
