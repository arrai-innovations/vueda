/**
 * @module theme/vueda-tailwind/views/ActionForm.theme
 *
 * Per-component theme registration for ActionForm. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ActionForm lays out a model action form, validation summary, selected
     * objects, and submit controls inside a view or card surface.
     */
    ActionForm: {
        /** Outer wrapper. Caps content at the `7xl` content column so a confirmation form does not stretch the full width of a wide viewport. */
        root: {
            class: ["max-w-7xl"],
        },
        /** Vertical stack for the form body (selected objects, message, fields). Gap scales up at breakpoints to keep section spacing legible on larger viewports. */
        inner: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4"],
        },
        /** Selected-objects panel passthrough when ActionForm renders standalone. When embedded in {@api theme-key:ModelActionForm}, the inner card owns the tinted chip-strip container; this slot stays empty so the parent recipe is authoritative. */
        selectedObjects: {
            class: [],
        },
        /** Confirm-prompt passthrough when ActionForm renders standalone. The canonical 2 px primary left-rule recipe lives on {@api theme-key:ModelActionForm.message}; this slot is intentionally empty for embedded usage. */
        message: {
            class: [],
        },
        /** Pinned actions strip closing the card body: horizontal row with a top hairline and a tinted-muted background that picks up the bottom radius via `rounded-b-vueda-card` when nested in {@api theme-key:ModelActionForm.card}. Wraps on narrow viewports rather than stacking column. */
        buttons: {
            class: [
                "flex flex-row flex-wrap items-center gap-2",
                "px-4 py-3 mt-2",
                "border-t-hairline bg-muted/25",
                "rounded-b-vueda-card",
            ],
        },
        /** Flexible filler between the confirm / cancel cluster and the optional hint, keeping the buttons pinned to the start of the strip. */
        buttonsSpacer: {
            class: ["flex-1 min-w-0"],
        },
        /** Right-aligned actions-hint slot inside the pinned strip, sized for keyboard shortcuts, reversibility notes, or audit hints. Muted-foreground at 12 px so the hint reads as supporting copy beside the action buttons. */
        buttonsHint: {
            class: ["ml-auto text-[12px] leading-none text-muted-foreground", "inline-flex items-center gap-1.5"],
        },
        /** Vertical list used when ActionForm is consumed outside the ModelActionForm chip-strip recipe (e.g. plain stacked rows of selected objects). Caps at `max-w-max` on `lg+` so the column hugs its longest row. */
        list: {
            class: ["flex flex-col gap-1 md:gap-2 lg:max-w-max"],
        },
        /** Row entry in the standalone list. Empty by default so the consumer can supply its own row chrome; the chip recipe lives on {@api theme-key:ModelActionForm.listItem}. */
        listItem: {
            class: [],
        },
        /** Non-field error block passthrough. Empty by default; the structured per-field validation alert below covers most cases, and consumers can opt into a richer block when they need free-form server errors above the form. */
        nonFieldErrorBlock: {
            class: "",
        },
        /** Structured per-field validation alert rendered when `formContext.state.anyError` is set and at least one field carries an error. Destructive 6%-mix fill with a destructive-tinted border; tone tracks danger via `data-tone="danger"` on the alert root so future skins can route through `group-data-[tone=danger]/action-form-validation:` variants. */
        validation: {
            class: [
                "flex items-start gap-3 p-3 mb-2",
                "rounded-vueda-card hairline [--vueda-hairline-color:color-mix(in_oklab,var(--destructive)_40%,transparent)]",
                "bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)]",
            ],
        },
        /** Destructive 36 px icon tile leading the validation alert. Matches the icon-tile recipe used on the {@api theme-key:ModelActionForm.bannerIcon} banner so the two destructive surfaces read as siblings. */
        validationIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-full bg-destructive text-destructive-foreground",
                "text-[18px] leading-none",
            ],
        },
        /** Inner body column inside the validation alert (title, description, bullet list). `min-w-0` lets the bullet list ellipsize a long field message instead of pushing the alert wider. */
        validationBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        /** Validation alert title. 14 px / 600 / foreground; carries the "Fix these to continue" headline copy. */
        validationTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** One-line description beneath the validation title. 12 px / muted-foreground so the headline / supporting-copy hierarchy reads at a glance. */
        validationDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        /** Tight unmarked list of per-field errors. Removes the default `<ul>` margin and bullet glyph since the row itself carries the field / message pairing. */
        validationList: {
            class: ["flex flex-col gap-0.5 m-0 mt-1 p-0 list-none"],
        },
        /** One row in the validation list: mono field name beside the human-readable message. Baseline-aligned so descenders stay even with the field label. */
        validationListItem: {
            class: ["flex items-baseline gap-2 text-[12px] leading-[1.5]"],
        },
        /** Field-name fragment in a validation row. Mono / 11.5 px / 500 / foreground; `shrink-0` keeps the name from wrapping when the message is long. */
        validationField: {
            class: ["font-mono text-[11.5px] font-medium text-foreground shrink-0"],
        },
        /** Human-readable message fragment in a validation row. 12 px / muted-foreground so the field name reads as the primary token and the message as supporting copy. */
        validationMsg: {
            class: ["text-[12px] font-normal text-muted-foreground"],
        },
    },
});
