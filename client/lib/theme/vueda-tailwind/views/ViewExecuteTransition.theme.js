/**
 * @module theme/vueda-tailwind/views/ViewExecuteTransition.theme
 *
 * Per-component theme registration for ViewExecuteTransition. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewExecuteTransition is the outer theme entry for the framework confirmation view
     * rendered for a recognized workflow transition code with no project-supplied override.
     */
    ViewExecuteTransition: {
        /** Outer wrapper around the embedded {@api theme-key:PageTitle} and {@api theme-key:ModelActionForm}. Empty by default; the two inner shells own all visible chrome, so this key exists only as the consumer-facing override surface and the data-qa anchor. */
        root: {
            class: [],
        },
    },
});
