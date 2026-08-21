/**
 * @module theme/vueda-tailwind/views/ViewRecoveryCodes.theme
 *
 * Per-component theme registration for ViewRecoveryCodes. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewRecoveryCodes lays out recovery-code display, print-hidden messages,
     * save actions, and empty-state controls.
     */
    ViewRecoveryCodes: {
        /** Outer wrapper. Empty; the embedded {@api theme-key:AuthForm} owns the framed card chassis, and the slots inside it own all visible chrome. */
        root: {
            class: [],
        },
        /** Bordered code-panel card inside the AuthForm body, rendered when the user has a TOTP device configured. Card-radius border with 16 px / 8 px padding so the unused-codes grid reads as a deliberate display surface rather than another form row; the print-hidden affordances above and below this card keep the printed output clean. The endpoint returns unused codes only, so there is no used-code state to render; {@api theme-key:ViewRecoveryCodes.listItem} would carry one if the server ever exposed it. */
        inner: {
            class: ["my-4 hairline hairline-border rounded-vueda-card py-4 px-2"],
        },
        /** Wrapper around the "each code works once" {@api theme-key:Alert}. `print:hidden` drops the alert from printed output so the page prints as a clean list of codes; `mx-4 my-6` centres the alert inside the bordered card with breathing room above the grid. */
        messageContainer: {
            class: ["mx-4 my-6 print:hidden"],
        },
        /** Container around the two-column code grid. `select-all` on the wrapper lets a triple-click copy the whole grid; `grow` lets the container claim remaining vertical space inside the card so short / long code lists both centre vertically. */
        listContainer: {
            class: ["m-4 gap-4 justify-center grow select-all flex"],
        },
        /** Two-column grid of unused recovery codes. `grid-cols-2` with asymmetric `gap-x-6 gap-y-1` so the columns read as two readable runs rather than a dense block; `select-all` reinforces the wrapper's copy behaviour so a click directly on the list also copies the full set. The default `<ol>` margin and bullet glyph are reset since the per-item numbering on {@api theme-key:ViewRecoveryCodes.listItemNum} carries the index. */
        list: {
            class: ["grid grid-cols-2 gap-x-6 gap-y-1 px-2 py-1", "select-all m-0 list-none"],
        },
        /** One code row. `grid-cols-[22px_1fr]` reserves a 22 px column for the index so all codes align on the same baseline regardless of digit count; mono / 14 px / 500 with a small letter-spacing bump so the dashed code reads as machine-input. A `data-used="true"` variant would swap the row to `line-through text-muted-foreground`, but the endpoint returns unused codes only, so nothing sets it today. */
        listItem: {
            class: [
                "grid grid-cols-[22px_1fr] items-baseline gap-2",
                "font-mono text-[14px] font-medium leading-[1.6] tracking-[0.04em]",
                "text-foreground",
            ],
        },
        /** Numbered prefix at the start of each code row. Mono / 11 px / muted-foreground with `tabular-nums` keeps the indices column-aligned as the count crosses the single-to-double-digit boundary; right-aligned inside the 22 px gutter so the period sits next to the code rather than the row edge. */
        listItemNum: {
            class: ["text-right font-mono text-[11px] font-normal leading-[1.6]", "text-muted-foreground tabular-nums"],
        },
        /** "Generate new recovery codes" title / blurb stack rendered in the action-bar slot above the regenerate button. Vertical stack so the bold title and the supporting paragraph beneath it read as a labelled pair, with 16 px vertical insets so the stack reads as a separable section above the submit cluster. */
        actionBarTitleTextContainer: {
            class: ["flex flex-col my-4"],
        },
        /** Centered row of Download / Print / Copy buttons beneath the code grid. `print:hidden` drops the buttons from printed output so the affordances do not appear next to the codes on paper; horizontal layout at all viewport widths since the three buttons fit on a phone-width screen. */
        savingOptionButtons: {
            class: ["flex items-center gap-2 justify-center mx-4 mb-4 print:hidden"],
        },
        /** Per-button class applied to each saving-option button. `min-w-[120px]` floors the buttons so Download / Print / Copy all read as a balanced trio regardless of label width; the variant chrome (outline) comes from the {@api theme-key:Button} props on the consumer side. */
        savingOptionButton: {
            class: ["min-w-[120px]"],
        },
        /** Action cluster shown in place of the regenerate column when the user has no TOTP device configured. Stacks "Set up a device" + "Go Back" on narrow viewports and inlines them at `sm+` so the empty branch matches the regenerate-form column rhythm above. */
        emptyActions: {
            class: ["flex flex-col sm:flex-row gap-2 justify-center"],
        },
        /** Action-bar column holding the regenerate title / blurb and the regenerate + go-back buttons. `print:hidden` drops the whole bar from printed output; `min-w-min` keeps the column from collapsing below its longest unbreakable word so the regenerate CTA stays legible at narrow widths. */
        actionBar: {
            class: ["flex flex-col gap-2 justify-center min-w-min print:hidden"],
        },
    },
});
