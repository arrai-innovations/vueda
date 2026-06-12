/**
 * @module theme/vueda-tailwind/views/AuthorizingForm.theme
 *
 * Per-component theme registration for AuthorizingForm. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AuthorizingForm centers the authorization form layout for flows that need
     * an explicit access or consent step.
     */
    AuthorizingForm: {
        /** Outer wrapper that fills the viewport and centers the framed card both axes. Differs from {@api theme-key:AuthForm.root} which flows top-aligned; the consent step is short enough that a vertically centered card reads as a focused decision surface. */
        root: {
            class: ["flex min-h-full justify-center items-center"],
        },
        /** Column around the framed card. No max-width cap (uses `max-w-full`) since the inner card already caps itself; the column exists only to anchor the inner card to its content. */
        outer: {
            class: ["flex flex-col max-w-full"],
        },
        /** Framed card surrounding the consent form. Mirrors {@api theme-key:AuthForm.inner} so sign-in and authorize flows share the same surface shape; 32 px padding, soft radius, capped at 35 rem on `sm+`. */
        inner: {
            class: [
                "p-8 rounded border bg-background",
                "flex flex-col items-stretch gap-3 overflow-y-auto",
                "max-w-full sm:w-[35rem]",
            ],
        },
        /** Inner content column inside the card. `min-w-min` keeps the column from collapsing below its longest unbreakable word. */
        contentContainer: {
            class: ["min-w-min"],
        },
        /** Title region above the form body. Project prose recipe with dark-mode invert so embedded markup picks up the typography scale; see {@api theme-key:AuthForm.title} for the matching sign-in recipe. */
        title: {
            class: ["prose dark:prose-invert mt-5"],
        },
    },
});
