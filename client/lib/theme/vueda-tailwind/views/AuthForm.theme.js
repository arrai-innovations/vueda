/**
 * @module theme/vueda-tailwind/views/AuthForm.theme
 *
 * Per-component theme registration for AuthForm. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 *
 * Prototype-phase duplication: this entry mirrors the AuthForm slice of
 * views/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AuthForm provides the framed authentication form layout used by sign-in
     * and related account access screens.
     */
    AuthForm: {
        /** Outer wrapper that fills the viewport vertically so the framed card can sit against the page background without a separate page chrome. */
        root: {
            class: ["flex min-h-full flex-col"],
        },
        /** Column between the viewport edge and the framed card. Caps at `3xl` so the card never stretches past the readable column width on a wide viewport. */
        outer: {
            class: ["flex flex-col gap-3 max-w-3xl"],
        },
        /** Framed card surrounding the form. 32 px padding on a bordered `--background` fill with a soft radius and an internal scroll if the form exceeds the viewport; capped at 35 rem on `sm+` so the card reads as a focused composition. */
        inner: {
            class: [
                "p-8 rounded border bg-background flex flex-col items-stretch gap-3 overflow-y-auto max-w-full sm:w-[35rem]",
            ],
        },
        /** Inner content column inside the card. `min-w-min` keeps the column from collapsing below its longest unbreakable word (e.g. a long heading). */
        contentContainer: {
            class: ["min-w-min"],
        },
        /** Title region above the form body. Uses the project prose recipe (with the dark-mode invert) so the embedded `<h1>` / `<p>` header markup picks up the typography scale without per-element rules. */
        title: {
            class: ["prose dark:prose-invert mt-5"],
        },
    },
});
