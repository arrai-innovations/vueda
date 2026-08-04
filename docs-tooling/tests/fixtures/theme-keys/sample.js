export default {
    // ---------- Button-family meta keys ----------
    _ButtonBase: {
        root: {
            class: ["inline-flex items-center"],
        },
    },
    _ButtonGhost: {
        root: { class: "hover:bg-accent" },
    },

    // ---------- Buttons ----------
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
    CalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root"],
            class: ["size-8", "p-0", { "bg-primary": true }],
        },
    },

    // ---------- Toggles ----------
    Toggle: {
        root: {
            class: ({ size }) => ["inline-flex", { "h-9": size === "default", "h-7": size === "sm" }],
        },
    },
    Bare: {
        root: { class: "single-class" },
    },
};
