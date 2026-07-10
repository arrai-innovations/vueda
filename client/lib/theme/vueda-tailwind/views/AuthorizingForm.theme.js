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
        /** Outer wrapper that fills the viewport and centers the framed card both axes. Uses `min-h-svh` rather than `min-h-full` so the fill works regardless of whether an integrator's shell gives this component's ancestors an explicit height; it never depends on a height cascade it does not control. Differs from {@api theme-key:AuthForm.root} which flows top-aligned; the consent step is short enough that a vertically centered card reads as a focused decision surface. */
        root: {
            class: ["flex min-h-svh justify-center items-center"],
        },
        /** Column around the framed card. No max-width cap (uses `max-w-full`) since the inner card already caps itself; the column exists only to anchor the inner card to its content. */
        outer: {
            class: ["flex flex-col max-w-full"],
        },
        /** Framed card surrounding the consent form. Mirrors {@api theme-key:AuthForm.inner} so sign-in and authorize flows share the same surface shape; 32 px padding, soft radius, capped at 35 rem on `sm+`. */
        inner: {
            class: [
                "p-8 rounded hairline hairline-border bg-background",
                "flex flex-col items-stretch gap-3 overflow-y-auto",
                "max-w-full sm:w-[35rem]",
            ],
        },
        /** Inner content column inside the card. `min-w-min` keeps the column from collapsing below its longest unbreakable word. */
        contentContainer: {
            class: ["min-w-min"],
        },
        /** Title region above the form body; spacing only, see `header` and `subTitle` for the text recipes. */
        title: {
            class: ["mt-5"],
        },
        /** The card's `<h1>`. AuthorizingForm has no separate PageTitle above it ("the card is the whole page"), so its heading carries the page-title role. */
        header: {
            class: ["text-title"],
        },
        /** The card's subtitle paragraph beneath the heading. Supporting-text recipe, matching {@api theme-key:FieldDescription.root}. */
        subTitle: {
            class: ["mt-1 text-muted-foreground text-[length:var(--vueda-text-supporting)] leading-[1.4] font-normal"],
        },
    },
});
