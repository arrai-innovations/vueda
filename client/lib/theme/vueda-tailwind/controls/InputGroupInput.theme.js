/**
 * @module theme/vueda-tailwind/controls/InputGroupInput.theme
 *
 * Per-component theme registration for InputGroupInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The text input child inside an InputGroup. Strips its own border /
     * shadow so the InputGroup shell owns the chrome.
     */
    InputGroupInput: {
        /** The text-input child inside an {@api theme-key:InputGroup.root}. Strips its own border, shadow, and focus ring so the surrounding group owns the chrome; flexes to fill the remaining row, and overrides the standalone {@api theme-key:Input} dark-mode tint with `dark:bg-transparent` so the group's tint is the only one painted. The focus reset needs `focus-visible:!shadow-none`: {@api theme-key:Input.root} paints its ring with `focus-visible:focus-ring-shadow`, whose variant selector outranks a plain `shadow-none`, so without it the input draws a second ring inside the group's. */
        root: {
            class: [
                // Chrome reset.
                "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:!shadow-none dark:bg-transparent",
            ],
        },
    },
});
