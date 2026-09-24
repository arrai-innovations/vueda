/**
 * @module theme/vueda-tailwind/views/ViewLoading.theme
 *
 * Per-component theme registration for ViewLoading.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /** ViewLoading displays a compact status without a card or placeholder layout. */
    ViewLoading: {
        /** Centers the loading status within the route container. */
        root: {
            class: ["flex justify-center px-6 py-12"],
        },
        /** Holds the status and any caller-supplied details. */
        content: {
            class: ["flex max-w-sm flex-col gap-3"],
        },
        /** Aligns the icon and loading message. */
        status: {
            class: ["flex items-center justify-center gap-3 text-muted-foreground"],
        },
        /** Loading icon size. */
        crest: {
            class: ["size-5 shrink-0"],
        },
        /** Slow-load icon size and color. */
        slowCrest: {
            class: ["size-5 shrink-0 text-warning"],
        },
        /** Optional context and request details below the status. */
        bodyRow: {
            class: ["flex flex-col gap-1 text-center"],
        },
        /** Normal loading message. */
        bodyRowText: {
            class: ["text-sm"],
        },
        /** Optional caller-provided context. */
        bodyRowSub: {
            class: ["text-xs text-muted-foreground"],
        },
        /** Optional HTTP verb and path. */
        request: {
            class: ["break-all font-mono text-xs text-muted-foreground"],
        },
        /** Extra classes for the optional request and dependency status strip. */
        heartbeat: {
            class: [],
        },
        /** Message shown once the slow threshold is reached. */
        slowTitle: {
            class: ["text-sm"],
        },
        /** Optional explanation of a slow load. */
        slowBlurb: {
            class: ["text-xs text-muted-foreground"],
        },
        /** Caller-provided actions during a slow load. */
        actions: {
            class: ["flex flex-wrap justify-center gap-2"],
        },
    },
});
