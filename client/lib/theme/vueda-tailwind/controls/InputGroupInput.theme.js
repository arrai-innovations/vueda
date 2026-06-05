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
        /** The text-input child inside an {@api theme-key:InputGroup.root}. Strips its own border, shadow, and focus ring so the surrounding group owns the chrome; flexes to fill the remaining row, and overrides the standalone {@api theme-key:Input} dark-mode tint with `dark:bg-transparent` so the group's tint is the only one painted. */
        root: {
            class: ["flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"],
        },
    },
});
