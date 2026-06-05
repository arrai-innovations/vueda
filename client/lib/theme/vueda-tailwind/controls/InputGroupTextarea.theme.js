/**
 * @module theme/vueda-tailwind/controls/InputGroupTextarea.theme
 *
 * Per-component theme registration for InputGroupTextarea. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The textarea child inside an InputGroup. Strips its own border / shadow
     * so the InputGroup shell owns the chrome.
     */
    InputGroupTextarea: {
        /** The textarea child inside an {@api theme-key:InputGroup.root}. Same chrome-strip recipe as {@api theme-key:InputGroupInput.root} plus `resize-none` so the textarea grows with content rather than offering a corner drag handle that would fight the group's shared shell. */
        root: {
            class: [
                "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
            ],
        },
    },
});
