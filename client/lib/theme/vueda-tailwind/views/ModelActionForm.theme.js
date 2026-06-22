/**
 * @module theme/vueda-tailwind/views/ModelActionForm.theme
 *
 * Per-component theme registration for ModelActionForm. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ModelActionForm renders the confirmation card used by model actions.
     * It carries tone-aware banner, selected-object, message, and button slots.
     */
    ModelActionForm: {
        /** Outer wrapper. Empty so the card or bare slot owns all visible chrome; layout decisions belong to whichever inner shell the form renders. */
        root: {
            class: [],
        },
        /** Bare-mode wrapper used when the form is embedded in an outer toned card (e.g. {@api theme-key:ViewDestroy.card}). Renders `display: contents` so chip-row tone routing still works via the parent `group/view-destroy` scope while suppressing this form's own card chrome. */
        bare: {
            class: ["contents"],
        },
        /** Canonical confirmation card. Opens a `group/model-action-form` named scope so descendants opt into tone via `group-data-[tone=…]/model-action-form:` variants, and routes a `data-[tone=…]:` border + 8% ring (`box-shadow: 0 0 0 3px <tone>/8%`) per tone. */
        card: {
            class: [
                "group/model-action-form",
                "rounded-vueda-card border bg-card overflow-hidden",

                // info (default)
                "data-[tone=info]:border-border",
                "data-[tone=info]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_8%,transparent)]",

                // success
                "data-[tone=success]:border-success/50",
                "data-[tone=success]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--success)_8%,transparent)]",

                // warning
                "data-[tone=warning]:border-warning/50",
                "data-[tone=warning]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--warning)_8%,transparent)]",

                // danger
                "data-[tone=danger]:border-destructive/50",
                "data-[tone=danger]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_8%,transparent)]",
            ],
        },
        /** Tone-tracked banner row at the top of the card. Background and border tint route from the card's `data-tone` via `group-data-[tone=…]/model-action-form:` variants; bottom hairline separates the banner from the body. */
        banner: {
            class: [
                "flex items-start gap-3 p-4",
                "border-b",
                // info
                "group-data-[tone=info]/model-action-form:border-border",
                "group-data-[tone=info]/model-action-form:bg-[color-mix(in_oklab,var(--info)_6%,transparent)]",
                // success
                "group-data-[tone=success]/model-action-form:border-success/20",
                "group-data-[tone=success]/model-action-form:bg-[color-mix(in_oklab,var(--success)_6%,transparent)]",
                // warning
                "group-data-[tone=warning]/model-action-form:border-warning/20",
                "group-data-[tone=warning]/model-action-form:bg-[color-mix(in_oklab,var(--warning)_6%,transparent)]",
                // danger
                "group-data-[tone=danger]/model-action-form:border-destructive/20",
                "group-data-[tone=danger]/model-action-form:bg-destructive/[0.06]",
            ],
        },
        /** 36 px circular icon tile leading the banner. Tile fill and foreground swap with tone (info / success / warning / danger) via the `group/model-action-form` scope; matches the destructive tile recipe on {@api theme-key:ActionForm.validationIcon} so danger surfaces read as siblings. */
        bannerIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-full",
                "text-[18px] font-semibold leading-none",

                // info
                "group-data-[tone=info]/model-action-form:bg-info",
                "group-data-[tone=info]/model-action-form:text-info-foreground",

                // success
                "group-data-[tone=success]/model-action-form:bg-success",
                "group-data-[tone=success]/model-action-form:text-success-foreground",

                // warning
                "group-data-[tone=warning]/model-action-form:bg-warning",
                "group-data-[tone=warning]/model-action-form:text-warning-foreground",

                // danger
                "group-data-[tone=danger]/model-action-form:bg-destructive",
                "group-data-[tone=danger]/model-action-form:text-destructive-foreground",
            ],
        },
        /** Inner column beside the icon: title, description, optional meta strip. `min-w-0` lets a long title ellipsize instead of pushing the banner wider. */
        bannerBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        /** Banner title. 14 px / 600 / foreground; the action's "what is about to happen" headline. */
        bannerTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** One-line description beneath the banner title. 12 px / muted-foreground so the headline / supporting-copy hierarchy reads at a glance. */
        bannerDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        /** Optional mono meta strip below the banner description (e.g. "action archive · scope 4 selected"). Mono with a small letter-spacing bump so machine-readable values stay legible at 11 px. */
        bannerMeta: {
            class: ["font-mono text-[11px] font-normal leading-[1.5] tracking-[0.04em]", "text-muted-foreground"],
        },
        /** Card body region beneath the banner. Holds the selected-objects panel, confirm prompt, and extra-fields stack with a 12 px gap between sections. */
        body: {
            class: ["p-4 flex flex-col gap-3"],
        },
        /** Inner stack used by the embedded {@api theme-key:ActionForm.inner} when ModelActionForm composes ActionForm. Mirrors the ActionForm rhythm so the field column reads continuously across the two shells. */
        inner: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4 mt-1"],
        },
        /** Selected-objects panel: tinted-muted background, hairline, card radius. Tone routing tints the panel destructive when nested in either the {@api theme-key:ViewDestroy.card} `group/view-destroy` scope or this form's own `group/model-action-form` scope at `tone="danger"`; neutral otherwise. */
        selectedObjects: {
            class: [
                "rounded-vueda-card bg-muted/25 border p-3",
                "flex flex-col gap-2",

                // Tint when surrounding ViewDestroy card is in danger tone.
                "group-data-[tone=danger]/view-destroy:bg-destructive/[0.06]",
                "group-data-[tone=danger]/view-destroy:border-destructive/40",

                // Same when the ModelActionForm card itself is in danger tone.
                "group-data-[tone=danger]/model-action-form:bg-destructive/[0.06]",
                "group-data-[tone=danger]/model-action-form:border-destructive/40",
            ],
        },
        /** Eyebrow head row above the chip strip: label on the left, mono count on the right. Wraps when the count grows long so the label never overflows the panel. */
        selectedHead: {
            class: ["flex flex-row items-baseline justify-between flex-wrap gap-2"],
        },
        /** Mono count beside the eyebrow label (e.g. `12 selected`). Mono / 11 px / `tabular-nums` so digits stay column-aligned as the count changes. */
        selectedHeadCount: {
            class: ["font-mono text-[11px] font-normal leading-none tabular-nums", "text-muted-foreground"],
        },
        /** Page-level eyebrow label above the chip strip. Uses the 11 px / 600 / `0.06em` uppercase recipe. */
        selectedObjectsLabel: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        /** Confirm-prompt panel: tinted-muted background with a 2 px primary left rule that signals "read this before you submit". Inner `flex-col` accommodates multi-paragraph guidance without breaking the rule's visual anchor. */
        message: {
            class: [
                "flex flex-col gap-1.5",
                "rounded-vueda-control bg-muted/25",
                "border-l-2 border-primary/60",
                "px-3 py-2.5",
            ],
        },
        /** Paragraph element inside the confirm-prompt panel. 13 px / foreground; resets the default `<p>` margin so consecutive paragraphs stack on the panel's own gap. */
        messageText: {
            class: ["text-[13px] leading-[1.5] text-foreground m-0"],
        },
        /** Extra-fields slot below the confirm prompt for action-specific inputs (reason, scope, etc.). Standard 12 px form-field stack so embedded fields line up with the surrounding field column. */
        extraFields: {
            class: ["flex flex-col gap-3"],
        },
        /** Internal button cluster passthrough when ModelActionForm composes its own confirm / cancel pair. The pinned actions strip recipe lives on {@api theme-key:ActionForm.buttons}; this slot lays out the buttons stacked at narrow widths and inline at `lg+`. */
        buttons: {
            class: ["flex flex-col lg:flex-row gap-1 md:gap-2 flex-wrap lg:flex-nowrap"],
        },
        /** Chip-row container inside the selected-objects panel. Wraps so a large selection folds across multiple rows instead of overflowing the card. The `list` / `listItem` / `listItemLabel` / `listItemPk` slot family is the kit's preferred selected-object dialect; the standalone {@api theme-key:ActionForm.list} stack is the alternative for non-card consumers. */
        list: {
            class: ["flex flex-row flex-wrap gap-2"],
        },
        /** One chip in the selected-objects strip: label + mono PK on a card-toned background with a hairline border. Tints destructive when nested in either the {@api theme-key:ViewDestroy.card} `group/view-destroy` scope or this form's own danger scope; neutral otherwise. */
        listItem: {
            class: [
                "inline-flex items-center gap-2 px-2 py-1 rounded-vueda-control",
                "border bg-card",
                "text-[12px] font-medium text-foreground leading-none",
                "group-data-[tone=danger]/view-destroy:border-destructive/40",
                "group-data-[tone=danger]/view-destroy:bg-card",
                "group-data-[tone=danger]/model-action-form:border-destructive/40",
                "group-data-[tone=danger]/model-action-form:bg-card",
            ],
        },
        /** Human-readable label fragment of a chip. 12 px / 500 / foreground so the label reads as the primary token in the chip. */
        listItemLabel: {
            class: ["text-[12px] font-medium text-foreground leading-none"],
        },
        /** Mono PK fragment of a chip. 11 px / mono / muted-foreground; tints destructive at 80 % strength under danger so the PK still reads as supporting copy beside the label. */
        listItemPk: {
            class: [
                "text-[11px] font-normal font-mono text-muted-foreground leading-none",
                "group-data-[tone=danger]/view-destroy:text-destructive/80",
                "group-data-[tone=danger]/model-action-form:text-destructive/80",
            ],
        },
        /** Non-field error block passthrough. Empty by default; the tone-tracked banner above and the per-field validation alert on {@api theme-key:ActionForm.validation} carry most failure feedback. */
        nonFieldErrorBlock: {
            class: "",
        },
    },
});
