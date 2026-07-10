/**
 * @module theme/vueda-tailwind/views/ViewWorkflowTransition.theme
 *
 * Per-component theme registration for ViewWorkflowTransition. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewWorkflowTransition presents selectable workflow transition options,
     * current state context, and terminal-state empty messaging.
     */
    ViewWorkflowTransition: {
        /** Outer wrapper. Empty; the embedded {@api theme-key:PageTitle} owns the header bar and the {@api theme-key:ViewWorkflowTransition.inner} body owns the form / empty-state surfaces, so this key exists only as the consumer-facing class hook (the SFC routes the `class` prop here). */
        root: {
            class: [],
        },
        /** Button cluster teleported into the PageTitle action zone via PageActions, landing in the {@api theme-key:PageTitle.buttons} slot. Holds the single Return-to-List link; right-aligned and `w-full` so the cluster takes the full button-slot width and pushes the link to the end of the title row. */
        buttons: {
            class: ["flex gap-1 w-full justify-end"],
        },
        /** Class forwarded to the `LinkModelView` inside the page-title buttons cluster. `whitespace-nowrap` keeps the link from breaking mid-label; `grow shrink-0` lets the link claim row width when narrow without ever collapsing below its natural width. */
        returnLink: {
            class: ["whitespace-nowrap grow shrink-0"],
        },
        /** Body wrapper around the transition form (or the terminal-state empty branch). Empty by default; the {@api theme-key:ViewWorkflowTransition.current} strip, {@api theme-key:ViewWorkflowTransition.list} list, and {@api theme-key:ViewWorkflowTransition.empty} card own all visible chrome inside. */
        inner: {
            class: [],
        },
        /** "Currently" strip above the transition list. Tinted-muted 40 % background with the card radius, sized to read as a context tag rather than a heading; 16 px bottom inset so the list below sits one rhythm-step beneath the current-state pill. */
        current: {
            class: ["flex items-center gap-2 mb-4 px-4 py-2.5", "rounded-vueda-card bg-muted/40 text-sm"],
        },
        /** "Currently" eyebrow inside the current-state strip. 12 px / 500 / `0.06em` uppercase against `--muted-foreground` so the label reads as a section eyebrow beside the state pill on its right. */
        currentLabel: {
            class: ["text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground"],
        },
        /** State-name pill beside the eyebrow. Muted fill on foreground at 12 px / 600 so the state reads as the primary token in the strip; sized at `py-0.5` so the pill stays vertically centered against the eyebrow's x-height. */
        currentPill: {
            class: [
                "inline-flex items-center px-2.5 py-0.5 rounded-full",
                "bg-muted text-foreground text-xs font-semibold",
            ],
        },
        /** Vertical list of transition options. 12 px gaps between options and a 16 px bottom inset so the list reads as a separable column above the submit button. */
        list: {
            class: ["flex flex-col gap-3 mb-4"],
        },
        /** Clickable `<label>` wrapping one transition option. Borders the option with the card radius and routes `data-selected="true"` to a primary border + primary/5 background, and `data-disabled="true"` to opacity 55 + `not-allowed` cursor. `has-[:focus-visible]` hoists the inner {@api theme-key:ViewWorkflowTransition.optionRadio}'s focus ring onto the option chassis so keyboard users see a ring on the visible target rather than the visually-hidden input. The textarea / reason path parked in BACKLOG-003 lands below the list, not on the option itself. */
        option: {
            class: [
                "relative flex flex-col gap-1 px-4 py-3",
                "rounded-vueda-card border-hairline cursor-pointer",
                "hover:border-primary/50 hover:bg-accent/30 active:bg-accent/50",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                "data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
                "data-[disabled=true]:opacity-55 data-[disabled=true]:cursor-not-allowed",
            ],
        },
        /** Visually-hidden `<input type="radio">` inside the option. `sr-only` keeps the input in the tab order and the form payload while {@api theme-key:ViewWorkflowTransition.option} carries the visible selection state via `data-selected`; the parent's `has-[:focus-visible]` recipe routes the focus ring onto the visible chassis. */
        optionRadio: {
            class: ["sr-only"],
        },
        /** Transition title inside the option. 14 px / 600 / foreground; reads as the primary token in the option, with the description and target-state badge sitting beneath it as supporting copy. */
        optionName: {
            class: ["text-sm font-semibold text-foreground"],
        },
        /** Transition description (or disabled-reason fallback) beneath the title. 12 px / muted-foreground per the headline / supporting-copy hierarchy. The slot is also used for the `disabled_reason` paragraph when the transition is server-disabled. */
        optionDesc: {
            class: ["text-xs text-muted-foreground"],
        },
        /** Target-state badge inside the option. `data-tone` selects the tonal recipe (success / warning / destructive / neutral) so the badge previews what state the model will land in if this transition runs. Sized at the supporting type tier so the badge reads as a tag beside the option's title and description, not a co-title. */
        optionTarget: {
            class: [
                "inline-flex items-center self-start px-2.5 py-0.5",
                "rounded-full text-xs font-semibold mt-1",
                "data-[tone=success]:bg-success/15 data-[tone=success]:text-success",
                "data-[tone=warning]:bg-warning/15 data-[tone=warning]:text-warning",
                "data-[tone=destructive]:bg-destructive/15 data-[tone=destructive]:text-destructive",
                "data-[tone=neutral]:bg-muted data-[tone=neutral]:text-muted-foreground",
            ],
        },
        /** Terminal-state empty card shown when the object has no transitions remaining. Dashed-border tinted panel with 48 px vertical padding so the surface reads as a deliberate end-of-workflow signal, not an error; the dashed border (vs the solid card border on {@api theme-key:ViewHistoryList.empty}) distinguishes "no further actions" from "no records yet". */
        empty: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-12 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed bg-muted/30",
            ],
        },
        /** 36 px circular icon tile leading the empty card (typically a flag glyph). Muted fill on muted-foreground keeps the tile from competing with the title beneath it; sized one tier smaller than the {@api theme-key:ViewSetupDevice.doneIcon} 48 px completion tile so the surface reads as terminal-state, not celebratory. */
        emptyIcon: {
            class: [
                "flex items-center justify-center",
                "w-9 h-9 rounded-full bg-muted text-muted-foreground",
                "text-[18px] leading-none",
            ],
        },
        /** Empty-card title ("No transitions available from `<state>`"). 14 px / 600 / foreground; same recipe as banner titles on {@api theme-key:ModelActionForm.bannerTitle} so empty states read consistently across surfaces. */
        emptyTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Empty-card description beneath the title. 12 px / muted-foreground capped at 44ch so the explanation reads as a paragraph, not a heading. */
        emptyDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        /** Action cluster beneath the empty-card description. `mt-2` opens a 8 px inset so the back-to-detail CTA sits one rhythm-step below the description; centered so the escape action is the focal point of the otherwise quiet panel. */
        emptyAction: {
            class: ["mt-2 flex justify-center"],
        },
    },
});
