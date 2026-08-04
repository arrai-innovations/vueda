/**
 * @module theme/vueda-tailwind/shell/DialogContent.theme
 *
 * Per-component theme registration for DialogContent. Imported as a side effect by
 * DialogContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogContent styles centered and full-screen modal surfaces plus their close affordance.
     */
    DialogContent: {
        /**
         * The dialog surface. Standard dialogs use fixed viewport centering, the modal radius, and overlay shadow; full-screen dialogs replace that geometry with a viewport-filling surface. Both own the paired background and foreground tokens.
         */
        root: ({ fullScreen }) => {
            const geometry = fullScreen
                ? [
                      // Full-screen layout.
                      "inset-0 h-dvh w-full max-w-none gap-0 rounded-none border-0 p-0",
                  ]
                : [
                      // Centered modal layout.
                      "top-[50%] left-[50%] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4",
                      "rounded-vueda-modal overlay-hairline overlay-hairline-elevated p-6 sm:max-w-lg",
                  ];
            return {
                class: [
                    // Surface and motion.
                    "bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

                    // Shared positioning and layout.
                    "fixed z-50 grid duration-200",

                    ...geometry,
                ],
            };
        },
        /**
         * The close control inside the dialog surface. It stays low-emphasis until hover or focus and uses the shared ring color for keyboard focus.
         */
        close: {
            class: [
                // Open state and positioning.
                "data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4",

                // Shape, motion, and states.
                "rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:focus-ring disabled:pointer-events-none",

                // Type.
                "text-sm leading-none",
            ],
        },
    },
});
