/**
 * @module theme/vueda-tailwind/views
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client page and view-level components.
 */

export default {
    // ---------- Page chrome ----------
    /**
     * PageTitle provides the compact header region for view titles, subtitles,
     * contextual actions, and optional sticky chrome.
     */
    PageTitle: {
        /** Outer header bar. Carries the bottom hairline that closes the header and, when `sticky` is set, pins the bar to the top of the scroll viewport at `z-30`. Consumers can merge extra classes via the `headerClass` prop without overriding the chrome. */
        root: ({ headerClass, sticky }) => ({
            class: [
                "border-b border-border",
                headerClass,
                {
                    "sticky top-0 z-30": sticky,
                },
            ],
        }),
        /** Vertical stack that holds the title row, the optional subtitle strip, and the footer. Layout-only; visible chrome lives on {@api theme-key:PageTitle.root}. */
        container: {
            class: ["flex flex-col"],
        },
        /** Title-row band: title cluster on the left, action buttons on the right. `px-5 py-3` sets the page-chrome horizontal rhythm shared with the {@api theme-key:ViewList} strips so the header reads continuous with the list chrome beneath it. */
        titleContainer: {
            class: [
                "w-full flex",
                "sm:flex-row sm:justify-between",
                "items-baseline justify-between",
                "gap-2 md:gap-4",
                "px-5 py-3",
            ],
        },
        /** Inner column that stacks the eyebrow above the title row. `min-w-min` keeps long titles from collapsing the column below their longest unbreakable word. */
        titleWrapper: {
            class: ["flex flex-col gap-1", "min-w-min"],
        },
        /** Page-level eyebrow above the title. Uses the 11 px / 600 / `0.06em` uppercase recipe described in `DESIGN.md § 3.3` against `--muted-foreground`. */
        eyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        /** Baseline-aligned row that holds the title and the optional title suffix. Wraps on narrow viewports so a long suffix can drop to a second line without breaking the title. */
        titleRow: {
            class: ["flex items-baseline flex-wrap gap-2"],
        },
        /** The page `<h1>`. Display-role type per `DESIGN.md § 3.1`: 22 px / 600 / 1.2 with a small negative tracking so the title reads as the highest-rank text on the page. */
        title: {
            class: ["text-[22px] font-semibold leading-[1.2] tracking-[-0.005em]"],
        },
        /** Mono trailing fragment beside the title (typically an ID, key, or status code). Mono / muted-foreground recipe per `DESIGN.md § 3.2`, sized one tier below the title so it reads as a tag, not a co-title. */
        titleSuffix: {
            class: ["text-muted-foreground text-[13px]/[1.4] font-normal font-mono"],
        },
        /** Action-button cluster on the right of the title row. Wraps so a long button list folds onto a second line instead of crowding the title. */
        buttons: {
            class: ["flex gap-1 flex-wrap", "justify-end", "self-center"],
        },
        /** Second-tier subtitle strip rendered below the title row when either the `subtitle` or `under-actions` slot is populated. Tinted-muted background and a top hairline distinguish it from the title band above and the list chrome below. */
        subtitleContainer: {
            class: [
                "w-full flex flex-wrap",
                "items-baseline justify-between",
                "gap-2 md:gap-4 lg:gap-7",
                "bg-muted/25 border-t border-border px-5 py-[10px]",
            ],
        },
        /** Footer slot beneath the header bar. Empty by default so consumer markup owns its own layout when populated. */
        footer: {
            class: [],
        },
        /** Sticky-mode gradient cap rendered below the bar. The 12 px band lets ObjectsGrid stripes fade under the pinned header instead of clipping abruptly. */
        gradient: {
            class: ["w-full h-3"],
        },
    },
    // ---------- Action forms ----------
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
        /** Pinned actions strip closing the card body: horizontal row with a top hairline and a tinted-muted background that picks up the bottom radius via `rounded-b-vueda-card` when nested in {@api theme-key:ModelActionForm.card}. Wraps on narrow viewports rather than stacking column. See `DESIGN.md § 9 Action / workflow surfaces`. */
        buttons: {
            class: [
                "flex flex-row flex-wrap items-center gap-2",
                "px-4 py-3 mt-2",
                "border-t border-border bg-muted/25",
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
                "rounded-vueda-card border border-destructive/40",
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
        /** Field-name fragment in a validation row. Mono / 11.5 px / 500 / foreground per `DESIGN.md § 3.2`; `shrink-0` keeps the name from wrapping when the message is long. */
        validationField: {
            class: ["font-mono text-[11.5px] font-medium text-foreground shrink-0"],
        },
        /** Human-readable message fragment in a validation row. 12 px / muted-foreground so the field name reads as the primary token and the message as supporting copy. */
        validationMsg: {
            class: ["text-[12px] font-normal text-muted-foreground"],
        },
    },
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
        /** Canonical confirmation card. Opens a `group/model-action-form` named scope so descendants opt into tone via `group-data-[tone=…]/model-action-form:` variants, and routes a `data-[tone=…]:` border + 8% ring (`box-shadow: 0 0 0 3px <tone>/8%`) per tone. See `DESIGN.md § 8.1 data-tone`. */
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
        /** Tone-tracked banner row at the top of the card. Background and border tint route from the card's `data-tone` via `group-data-[tone=…]/model-action-form:` variants; bottom hairline separates the banner from the body. See `DESIGN.md § 8.1 data-tone`. */
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
                "group-data-[tone=info]/model-action-form:bg-info group-data-[tone=info]/model-action-form:text-info-foreground",
                // success
                "group-data-[tone=success]/model-action-form:bg-success group-data-[tone=success]/model-action-form:text-success-foreground",
                // warning
                "group-data-[tone=warning]/model-action-form:bg-warning group-data-[tone=warning]/model-action-form:text-warning-foreground",
                // danger
                "group-data-[tone=danger]/model-action-form:bg-destructive group-data-[tone=danger]/model-action-form:text-destructive-foreground",
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
        /** Optional mono meta strip below the banner description (e.g. "action archive · scope 4 selected"). Mono per `DESIGN.md § 3.2` with a small letter-spacing bump so machine-readable values stay legible at 11 px. */
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
        /** Selected-objects panel: tinted-muted background, hairline, card radius. Tone routing tints the panel destructive when nested in either the {@api theme-key:ViewDestroy.card} `group/view-destroy` scope or this form's own `group/model-action-form` scope at `tone="danger"`; neutral otherwise. See `DESIGN.md § 9 Action / workflow surfaces`. */
        selectedObjects: {
            class: [
                "rounded-vueda-card bg-muted/25 border border-border p-3",
                "flex flex-col gap-2",
                // Tint when surrounding ViewDestroy card is in danger tone.
                "group-data-[tone=danger]/view-destroy:bg-destructive/[0.06] group-data-[tone=danger]/view-destroy:border-destructive/40",
                // Same when the ModelActionForm card itself is in danger tone.
                "group-data-[tone=danger]/model-action-form:bg-destructive/[0.06] group-data-[tone=danger]/model-action-form:border-destructive/40",
            ],
        },
        /** Eyebrow head row above the chip strip: label on the left, mono count on the right. Wraps when the count grows long so the label never overflows the panel. */
        selectedHead: {
            class: ["flex flex-row items-baseline justify-between flex-wrap gap-2"],
        },
        /** Mono count beside the eyebrow label (e.g. `12 selected`). Mono / 11 px / `tabular-nums` per `DESIGN.md § 3.2` so digits stay column-aligned as the count changes. */
        selectedHeadCount: {
            class: ["font-mono text-[11px] font-normal leading-none tabular-nums", "text-muted-foreground"],
        },
        /** Page-level eyebrow label above the chip strip. Uses the 11 px / 600 / `0.06em` uppercase recipe per `DESIGN.md § 3.3`. */
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
                "border border-border bg-card",
                "text-[12px] font-medium text-foreground leading-none",
                "group-data-[tone=danger]/view-destroy:border-destructive/40 group-data-[tone=danger]/view-destroy:bg-card",
                "group-data-[tone=danger]/model-action-form:border-destructive/40 group-data-[tone=danger]/model-action-form:bg-card",
            ],
        },
        /** Human-readable label fragment of a chip. 12 px / 500 / foreground so the label reads as the primary token in the chip. */
        listItemLabel: {
            class: ["text-[12px] font-medium text-foreground leading-none"],
        },
        /** Mono PK fragment of a chip. 11 px / mono / muted-foreground per `DESIGN.md § 3.2`; tints destructive at 80 % strength under danger so the PK still reads as supporting copy beside the label. */
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
    /**
     * ViewDestroy wraps destructive model actions in danger-toned confirmation
     * chrome before delegating the actual form controls.
     */
    ViewDestroy: {
        /** Outer wrapper. Empty; the card below owns all visible chrome. */
        root: {
            class: [],
        },
        /** Outer danger card. Opens a `group/view-destroy` named scope, carries a destructive-bordered card with an 8 % destructive ring, and wraps the embedded {@api theme-key:ModelActionForm} in `:bare="true" tone="danger"` so the inner card is suppressed and this surface stays authoritative. See `DESIGN.md § 8.1 data-tone`. */
        card: {
            class: [
                "group/view-destroy",
                "rounded-vueda-card border bg-card overflow-hidden",
                "border-destructive/50",
                "shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_8%,transparent)]",
            ],
        },
        /** Banner row at the top of the danger card: destructive 6 %-mix background, destructive-tinted bottom hairline. Mirrors the {@api theme-key:ModelActionForm.banner} layout so danger and tone-routed banners read as siblings. */
        banner: {
            class: ["flex items-start gap-3 p-4", "border-b border-destructive/20 bg-destructive/[0.06]"],
        },
        /** 36 px destructive icon tile leading the banner. Fixed destructive recipe (no tone routing) since ViewDestroy is the danger specialization; matches {@api theme-key:ModelActionForm.bannerIcon} under the danger tone. */
        bannerIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-full bg-destructive text-destructive-foreground",
                "text-[18px] font-semibold leading-none",
            ],
        },
        /** Inner column beside the icon: title above description. `min-w-0` lets long titles ellipsize instead of pushing the banner wider. */
        bannerBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        /** Banner title. 14 px / 600 / foreground; the destructive action's "what is about to happen" headline. */
        bannerTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** One-line description beneath the title (typically the `ConsequencesBullets` fallback or its leading sentence). 12 px / muted-foreground per the headline / supporting-copy hierarchy. */
        bannerDescription: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        /** Body region beneath the banner: holds the consequences cascade and the embedded ModelActionForm. 16 px padding so the card edge stays clear of the chip-strip border. */
        body: {
            class: ["p-4"],
        },
    },
    // ---------- Authentication forms ----------
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
        /** Title region above the form body. Uses the project prose recipe (with the dark-mode invert) so embedded `<h1>` / `<p>` markup picks up the typography scale without per-element rules; the embedded {@api theme-key:PageTitle} renders the actual header bar. */
        title: {
            class: ["prose dark:prose-invert mt-5"],
        },
    },
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
                "p-8 rounded border bg-background flex flex-col items-stretch gap-3 overflow-y-auto max-w-full sm:w-[35rem]",
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
    // ---------- List views ----------
    /**
     * ViewList arranges the model list page controls around search, filters,
     * bulk actions, grid content, totals, and pagination.
     */
    ViewList: {
        /** Class forwarded to the `selected_` checkbox column on the embedded {@api theme-key:ObjectsGrid}. Collapses the column to `w-0` at the `lg+` table breakpoint so card layouts keep room for the selection toggle while the table layout absorbs it into the row chrome. The breakpoint is hard-coded rather than derived from the `tableBreakpoint` prop because Tailwind purges classes it cannot see at build time; keep this aligned with the prop default. */
        selectedCheckbox: {
            class: ["lg:w-0"],
        },
        /** Class forwarded to the {@api theme-key:InputGroupInput} inside the search slot. Caps the input at 30ch on `lg+` so the search field does not consume the entire control bar on wide viewports. */
        searchInput: {
            class: ["lg:max-w-[30ch]"],
        },
        /** Per-button class applied to bulk-action {@api theme-key:LinkModelView} entries inside the bulk-actions strip. `grow` on narrow viewports lets each button claim its share of the row width; `sm:grow-0` reverts to natural width once the row can hold the buttons inline. */
        bulkActionButton: {
            class: ["grow sm:grow-0"],
        },
        /** Per-button class applied to targetless-action entries rendered in the {@api theme-key:PageTitle.buttons} cluster. Empty by default; the buttons inherit the {@api theme-key:PageTitle} cluster layout and only need an override when a consumer wants action-specific chrome. */
        targetlessActionButton: {
            class: [],
        },
        /** Filter strip beneath the under-actions row. Tinted-muted background with a bottom hairline so it reads as a tier between the under-actions strip and the grid; uses the same `px-5 py-[10px]` rhythm shared with {@api theme-key:PageTitle.titleContainer} so the page chrome lines up vertically. */
        filterGroupBar: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-[10px] border-b border-border bg-muted/25"],
        },
        /** "Filters" eyebrow label at the left of the filter strip. Uses the 11 px / 600 / `0.06em` uppercase recipe described in `DESIGN.md § 3.3` against `--muted-foreground` so it reads as a section eyebrow, not a heading. */
        filterGroupBarEyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        /** Right-aligned wrapper around the mobile sort component. Pushes the sort trigger to the end of the filter strip so it sits opposite the eyebrow on narrow viewports where the desktop column-header sort affordances are unavailable. */
        sortComponentDiv: {
            class: ["flex flex-row justify-end ml-auto"],
        },
        /** Class forwarded to the embedded {@api theme-key:ObjectsGrid.root}. Suppresses the grid's own card border and radius so the ViewList strips above and below own the visible chrome; the grid renders as a flush slab between the filter strip and the pagination strip. */
        objectsGrid: {
            class: ["w-full border-0 rounded-none"],
        },
        /** Strip beneath the title row that holds the search input and the column-hiding select. Card-toned with a bottom hairline; shares the page-chrome rhythm with {@api theme-key:ViewList.filterGroupBar} and the title row, so the three strips read as a continuous header. */
        underActionsBar: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-3 border-b border-border bg-card"],
        },
        /** Bulk-actions strip that surfaces once one or more rows are selected. 6 %-mix primary fill and 12 px / 500 type so it reads as an active selection band, not a passive section; sits between the under-actions strip and the filter strip. */
        bulkActionsBar: {
            class: [
                "w-full flex items-center flex-wrap gap-[10px] px-5 py-[10px]",
                "border-b border-border bg-primary/[0.06] text-[12px] font-medium",
            ],
        },
        /** Button cluster inside the bulk-actions strip. Wraps so a large action menu folds across rows rather than overflowing the strip; `sm:w-fit sm:max-w-max` snaps the cluster to its content width once the viewport can hold all buttons inline. */
        actionButtonGroupBar: {
            class: ["flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"],
        },
        /** Right-aligned control cluster inside {@api theme-key:ViewList.underActionsBar} (search input + columns select). `ml-auto` pushes the cluster to the end of the strip so the title row above and this row align on the right. */
        listControlBar: {
            class: ["flex flex-row gap-1 2xl:gap-2 ml-auto"],
        },
        /** Cell class for the column-totals row appended below the body rows when any column declares a total. The 2 px top border separates the totals row from the data rows above it; the cell otherwise inherits {@api theme-key:ObjectsGridBodyCell} chrome. */
        columnTotalCell: {
            class: "border-t-2",
        },
        /** Pagination strip beneath the grid. Card-toned with a top hairline; mirrors the {@api theme-key:ViewList.underActionsBar} rhythm so the chrome above and below the grid read as a matched pair. */
        paginationWrapper: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-[10px] border-t border-border bg-card"],
        },
    },
    /**
     * ViewHistoryList styles the revision history view, including grouped rows,
     * diff cells, history metadata, and empty states.
     */
    ViewHistoryList: {
        /** Outer wrapper. Empty by default; the meta strip, embedded grid, and empty-state card own all visible chrome so the wrapper stays a layout-only anchor. */
        root: {
            class: [],
        },
        /** Row passthrough forwarded to the embedded {@api theme-key:ObjectsGrid.row}. Paints a 2 px primary left-stripe on the first cell of every row that belongs to a revision (both `data-rev-start` and `data-rev-child`), so a multi-row revision reads as a single grouped band. The card surrounding the grid carries the outer border, so this binding does not redeclare the row's own border. */
        row: {
            class: [
                "data-[rev-start=true]:[&>*:first-child]:border-l-2",
                "data-[rev-start=true]:[&>*:first-child]:border-primary",
                "data-[rev-child=true]:[&>*:first-child]:border-l-2",
                "data-[rev-child=true]:[&>*:first-child]:border-primary",
            ],
        },
        /** Diff chip rendered in each old / new field-value cell. `data-side` selects the tonal recipe (`old` = destructive 7 %-mix with a leading minus glyph; `new` = success 8 %-mix with a leading plus glyph), and `data-empty` overrides both into a transparent italic muted-foreground row with a middle-dot glyph for "nothing on this side". Mono per `DESIGN.md § 3.2` so whitespace and unicode artifacts in the diffed value stay readable. */
        diff: {
            class: [
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-vueda-control",
                "font-mono text-[12px] leading-[1.4]",
                "before:font-semibold before:text-[11px]",
                "data-[side=old]:bg-[color-mix(in_oklab,var(--destructive)_7%,transparent)]",
                "data-[side=old]:text-foreground",
                "data-[side=old]:before:content-['−'] data-[side=old]:before:text-destructive",
                "data-[side=new]:bg-[color-mix(in_oklab,var(--success)_8%,transparent)]",
                "data-[side=new]:text-foreground",
                "data-[side=new]:before:content-['+'] data-[side=new]:before:text-success",
                "data-[empty=true]:italic data-[empty=true]:text-muted-foreground",
                "data-[empty=true]:bg-transparent",
                "data-[empty=true]:before:content-['·'] data-[empty=true]:before:text-muted-foreground",
            ],
        },
        /** Empty-state card shown when the model has no recorded history. Card-toned with a soft border and 48 px vertical padding so the panel reads as a deliberate state, not an error; the icon / title / description trio inside provides the recovery messaging. */
        empty: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-12 px-6 text-center",
                "rounded-vueda-card border border-border bg-card",
            ],
        },
        /** 40 px circular icon tile leading the empty state (typically a clock or history glyph). Muted-50 fill on muted-foreground keeps the tile from competing with the title beneath it. */
        emptyIcon: {
            class: [
                "flex items-center justify-center",
                "w-10 h-10 rounded-full bg-muted/50 text-muted-foreground",
                "text-[16px] leading-none",
            ],
        },
        /** Empty-state title ("No history yet" or similar). 14 px / 600 / foreground; same recipe as banner titles on {@api theme-key:ModelActionForm.bannerTitle} so empty states read consistently across surfaces. */
        emptyTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Empty-state description beneath the title. 12 px / muted-foreground capped at 44ch so the explanation reads as a paragraph, not a heading. */
        emptyDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        /** Absolute timestamp on the upper line of the two-line history-date cell. 12 px / foreground so the absolute value reads as the primary token; the relative phrase on {@api theme-key:ViewHistoryList.cellDateRel} sits beneath it. */
        cellDate: {
            class: ["text-[12px] leading-[1.3] text-foreground"],
        },
        /** Relative phrase ("3 days ago") beneath the absolute timestamp. 11 px / muted-foreground per the headline / supporting-copy hierarchy. */
        cellDateRel: {
            class: ["text-[11px] leading-[1.3] text-muted-foreground"],
        },
        /** Inline wrapper around the 22 px {@api theme-key:UserAvatar} chip and the actor name beside it. `inline-flex` keeps the chip / name pair on a single baseline so the row aligns vertically with the other history columns. */
        cellUser: {
            class: ["inline-flex items-center gap-2"],
        },
        /** Actor-name fragment next to the avatar chip. Uses the supporting type token at 500 / foreground so the name reads as the primary value in the cell. */
        cellUserName: {
            class: ["text-[length:var(--vueda-text-supporting)] font-medium leading-tight text-foreground"],
        },
        /** History-type pill ("Created", "Updated", "Deleted", "Restored") rendered in the history-type column. `data-kind` selects the tonal recipe (created = success, updated = info, deleted = destructive, restored = warning); unknown values fall back to the raw display value via the slot fallback in the consumer, not this recipe. Small uppercase label with a 12 px leading icon so the pill reads as a category tag, not a button. */
        typePill: {
            class: [
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                "text-[10.5px] font-semibold uppercase tracking-wide leading-none",
                "[&>svg]:size-3",
                "data-[kind=created]:border-success/30 data-[kind=created]:bg-[color-mix(in_oklab,var(--success)_10%,transparent)] data-[kind=created]:text-success",
                "data-[kind=updated]:border-info/25 data-[kind=updated]:bg-[color-mix(in_oklab,var(--info)_8%,transparent)] data-[kind=updated]:text-info",
                "data-[kind=deleted]:border-destructive/25 data-[kind=deleted]:bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] data-[kind=deleted]:text-destructive",
                "data-[kind=restored]:border-warning/30 data-[kind=restored]:bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] data-[kind=restored]:text-warning",
            ],
        },
        /** Meta strip above the grid: filter slot on the left, layout toggle on the right. Muted-10 wash and a bottom hairline so the strip reads as supporting chrome rather than its own band; lighter than the {@api theme-key:ViewList.filterGroupBar} muted-25 because the history view does not surface as many filter affordances. */
        meta: {
            class: ["flex items-center gap-3 flex-wrap", "border-b border-border bg-muted/10", "px-4 py-2 text-sm"],
        },
        /** Inline item inside the meta strip (e.g. an active filter chip). Muted-foreground colour and a 4 px gap between icon and label so the item reads as supporting metadata. */
        metaItem: {
            class: ["inline-flex items-center gap-1 text-muted-foreground"],
        },
        /** Vertical hairline separator between meta items. 12 px tall, `var(--border)` fill; sized to match the meta-row x-height so the divider aligns with the text baseline. */
        metaDivider: {
            class: ["mx-2 h-3 w-px bg-border"],
        },
        /** Flexible filler that pushes the layout toggle to the right end of the meta strip. */
        metaSpacer: {
            class: ["ml-auto"],
        },
        /** Outer chassis of the segmented Table / Cards button pair. `overflow-clip` lets the inner buttons render their own internal hairline (`first:border-r`) without poking past the chassis radius. */
        layoutToggle: {
            class: ["flex overflow-clip rounded-vueda-control border border-border"],
        },
        /** One button inside the layout toggle. Transparent / muted-foreground in the default state and tinted accent at `data-active="true"`; the leading icon is sized at 12 px so it sits with the label baseline. Focus ring uses `outline-ring` so it follows the system focus-recipe alongside the rest of the kit. */
        layoutButton: {
            class: [
                "inline-flex items-center gap-1.5 px-2 py-1 text-xs",
                "text-muted-foreground bg-transparent",
                "first:border-r first:border-border",
                "hover:bg-accent hover:text-accent-foreground",
                "data-[active=true]:bg-accent data-[active=true]:text-foreground",
                "[&>svg]:size-3",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            ],
        },
        /** Optional extra class applied to the active layout button. Empty by default because {@api theme-key:ViewHistoryList.layoutButton} already routes its active state via `data-[active=true]`; consumers can opt into an additional emphasis here without duplicating the base recipe. */
        layoutButtonActive: {
            class: [],
        },
    },
    // ---------- System views ----------
    /**
     * ViewLoading presents the route loading state with centered message card
     * content, skeleton, heartbeat, and slow-load messaging slots.
     */
    ViewLoading: {
        /** Centering wrapper that fills the viewport vertically and centers the embedded {@api theme-key:SystemMessageCard} on both axes. The card chassis is fixed-width, so a flex parent is required for it to sit in the middle of an otherwise-empty page. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** 20 px {@api theme-key:LoadingSpinnerBlock} forwarded into the card's `crest-icon` slot on the normal (non-slow) path. Sized to read as a glyph beside the crest label, not as the dominant figure in the card. */
        crest: {
            class: ["w-5 h-5"],
        },
        /** Hourglass span forwarded into the card's `crest-icon` slot once the slow-path tone activates. 18 px so the swap reads as a deliberate state change against the 20 px spinner it replaces. */
        slowCrest: {
            class: ["text-[18px] leading-none"],
        },
        /** Stacked row inside the card body that holds either the name / context pair (normal path) or the slow title / blurb pair (slow path). 4 px gap so the two lines read as a labelled pair, not as separate paragraphs. */
        bodyRow: {
            class: ["flex flex-col gap-1"],
        },
        /** Primary "what is loading" line on the normal path. 14 px / 600 / foreground; same recipe as banner titles on {@api theme-key:ModelActionForm.bannerTitle} so loading and confirmation surfaces read consistently. */
        bodyRowText: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** One-line context beneath the name. 12 px / muted-foreground per the headline / supporting-copy hierarchy. */
        bodyRowSub: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        /** Extra classes forwarded to {@api theme-key:LoadingSkeletonGhost}. Empty by default; the skeleton ships its own internal sizing and consumers only override when a specific route wants a different placeholder shape. */
        skeleton: {
            class: [],
        },
        /** Extra classes forwarded to {@api theme-key:LoadingHeartbeatStrip}. Empty by default; the strip carries its own chrome and consumers only override when a specific route wants a different elapsed-time band. */
        heartbeat: {
            class: [],
        },
        /** Slow-path title ("This is taking longer than usual") that replaces {@api theme-key:ViewLoading.bodyRowText} once `elapsedMs >= slowAfterMs`. Same 14 px / 600 / foreground recipe so the swap stays type-stable. */
        slowTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Route-specific explanation rendered beneath the slow-path title when a `slowBlurb` prop is provided. 12 px / muted-foreground; same recipe as the normal-path context line so the body stays the same shape across the tone flip. */
        slowBlurb: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
    },
    /**
     * ViewNotFound displays the generic missing-route state in a centered
     * system message layout.
     */
    ViewNotFound: {
        /** Centering wrapper around the embedded {@api theme-key:SystemMessageCard}. The card chassis is fixed-width, so a flex parent is required for it to sit in the middle of the viewport. Mirrors {@api theme-key:ViewLoading.root}. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** Explanatory paragraph rendered beneath the crest when the `blurb` slot is not overridden. 13 px / muted-foreground so it reads as supporting copy beside the card title. */
        blurb: {
            class: ["text-[13px] leading-[1.5] text-muted-foreground"],
        },
    },
    /**
     * ViewActionNotFound displays the missing-action state for a model view
     * when the requested action cannot be resolved.
     */
    ViewActionNotFound: {
        /** Centering wrapper around the embedded {@api theme-key:SystemMessageCard}. See {@api theme-key:ViewNotFound.root}; the two views share the recipe so missing-route and missing-action surfaces read as siblings. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** Explanatory paragraph rendered beneath the crest when the `blurb` slot is not overridden. 13 px / muted-foreground; matches {@api theme-key:ViewNotFound.blurb}. */
        blurb: {
            class: ["text-[13px] leading-[1.5] text-muted-foreground"],
        },
    },
    // ---------- Workflow views ----------
    /**
     * ViewAction is the outer theme entry for generic action views that supply
     * their own internal content.
     */
    ViewAction: {
        root: {
            class: [],
        },
    },
    /**
     * ViewActivate is the outer theme entry for activation flows that share the
     * generic view-action structure.
     */
    ViewActivate: {
        root: {
            class: [],
        },
    },
    /**
     * ViewDeactivate presents the account or object deactivation flow in a
     * centered message-card layout with submit error feedback.
     */
    ViewDeactivate: {
        // Centering wrapper: card is 460 px so it needs a flex parent to center on the page.
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        // Default suspension-explanation blurb. Slot override takes precedence.
        message: {
            class: ["text-[13px] leading-[1.5] text-muted-foreground"],
        },
        // Submit-error paragraph shown when the PATCH fails.
        error: {
            class: ["text-[12px] text-destructive leading-[1.5]"],
        },
    },
    // ---------- Authentication workflows ----------
    /**
     * ViewTwoFactorAuth styles the two-factor authentication challenge,
     * recovery-code toggle, verification input, and cooldown indicator.
     */
    ViewTwoFactorAuth: {
        root: {
            class: [],
        },
        buttons: {
            class: ["flex flex-col gap-2 pt-4"],
        },
        recoveryToggle: {
            class: ["self-start"],
        },
        recoveryInput: {
            class: ["font-mono tracking-[0.04em]"],
        },
        cooldownChip: {
            class: [
                "inline-flex items-center justify-center px-2 py-0.5 rounded-full",
                "bg-muted/70 text-muted-foreground",
                "font-mono text-[11px] font-medium leading-none tabular-nums",
            ],
        },
    },
    /**
     * ViewSetupDevice styles the multi-step device setup flow, including step
     * indicators, manual key display, and completion state.
     */
    ViewSetupDevice: {
        steps: {
            class: ["flex items-center gap-2 mb-4"],
        },
        step: {
            class: ["flex items-center gap-2", "data-[state=upcoming]:opacity-60"],
        },
        stepNum: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-[18px] h-[18px] rounded-full",
                "text-[11px] font-semibold leading-none",
                "border border-border bg-background text-muted-foreground",
                "data-[state=current]:bg-primary data-[state=current]:text-primary-foreground data-[state=current]:border-primary",
                "data-[state=done]:bg-primary/15 data-[state=done]:text-primary data-[state=done]:border-primary/40",
            ],
        },
        stepLabel: {
            class: [
                "text-[11px] font-semibold uppercase tracking-[0.06em] leading-none",
                "text-muted-foreground",
                "data-[state=current]:text-foreground",
                "data-[state=done]:text-foreground",
            ],
        },
        stepDivider: {
            class: ["flex-1 h-px bg-border"],
        },
        manualKey: {
            class: [
                "flex items-center gap-2 px-3 py-[10px] mt-2",
                "rounded-vueda-control border border-border bg-background",
            ],
        },
        manualKeyLabel: {
            class: [
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
                "text-muted-foreground shrink-0",
            ],
        },
        manualKeyValue: {
            class: [
                "font-mono text-[12.5px] font-medium leading-none",
                "text-foreground select-all truncate min-w-0 flex-1",
            ],
        },
        done: {
            class: ["flex flex-col items-center text-center gap-3 py-6"],
        },
        doneIcon: {
            class: [
                "flex items-center justify-center",
                "w-12 h-12 rounded-full bg-primary/15 text-primary",
                "text-[24px] leading-none",
            ],
        },
        doneTitle: {
            class: ["text-[16px] font-semibold leading-[1.3] text-foreground"],
        },
        doneDescription: {
            class: ["text-[13px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        doneActions: {
            class: ["flex gap-2 mt-2"],
        },
    },
    // ---------- Workflow transitions ----------
    /**
     * ViewWorkflowTransition presents selectable workflow transition options,
     * current state context, and terminal-state empty messaging.
     */
    ViewWorkflowTransition: {
        root: {
            class: [],
        },
        buttons: {
            class: ["flex gap-1 w-full justify-end"],
        },
        returnLink: {
            class: ["whitespace-nowrap grow shrink-0"],
        },
        inner: {
            class: [],
        },
        current: {
            class: ["flex items-center gap-2 mb-4 px-4 py-2.5 rounded-vueda-card bg-muted/40 text-sm"],
        },
        currentLabel: {
            class: ["text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground"],
        },
        currentPill: {
            class: [
                "inline-flex items-center px-2.5 py-0.5 rounded-full",
                "bg-muted text-foreground text-xs font-semibold",
            ],
        },
        list: {
            class: ["flex flex-col gap-3 mb-4"],
        },
        option: {
            class: [
                "relative flex flex-col gap-1 px-4 py-3 rounded-vueda-card border border-border cursor-pointer",
                "hover:border-primary/50 hover:bg-accent/30",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                "data-[selected=true]:border-primary data-[selected=true]:bg-primary/5",
                "data-[disabled=true]:opacity-55 data-[disabled=true]:cursor-not-allowed",
            ],
        },
        optionRadio: {
            class: ["sr-only"],
        },
        optionName: {
            class: ["text-sm font-semibold text-foreground"],
        },
        optionDesc: {
            class: ["text-xs text-muted-foreground"],
        },
        optionTarget: {
            class: [
                "inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1",
                "data-[tone=success]:bg-success/15 data-[tone=success]:text-success",
                "data-[tone=warning]:bg-warning/15 data-[tone=warning]:text-warning",
                "data-[tone=destructive]:bg-destructive/15 data-[tone=destructive]:text-destructive",
                "data-[tone=neutral]:bg-muted data-[tone=neutral]:text-muted-foreground",
            ],
        },
        // Terminal-state empty branch: dashed-border tinted panel with a centred 36px circle
        // icon, one-line title, short description, and a forward-pointing escape CTA.
        empty: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-12 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed border-border bg-muted/30",
            ],
        },
        emptyIcon: {
            class: [
                "flex items-center justify-center",
                "w-9 h-9 rounded-full bg-muted text-muted-foreground",
                "text-[18px] leading-none",
            ],
        },
        emptyTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        emptyDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        emptyAction: {
            class: ["mt-2 flex justify-center"],
        },
    },
    // ---------- Recovery codes ----------
    /**
     * ViewRecoveryCodes lays out recovery-code display, print-hidden messages,
     * save actions, and empty-state controls.
     */
    ViewRecoveryCodes: {
        root: {
            class: [],
        },
        inner: {
            class: ["my-4 border border-border rounded-vueda-card py-4 px-2"],
        },
        messageContainer: {
            class: ["mx-4 my-6 print:hidden"],
        },
        listContainer: {
            class: ["m-4 gap-4 justify-center grow select-all flex"],
        },
        list: {
            class: ["grid grid-cols-2 gap-x-6 gap-y-1 px-2 py-1", "select-all m-0 list-none"],
        },
        listItem: {
            class: [
                "grid grid-cols-[22px_1fr] items-baseline gap-2",
                "font-mono text-[14px] font-medium leading-[1.6] tracking-[0.04em]",
                "text-foreground",
            ],
        },
        listItemNum: {
            class: ["text-right font-mono text-[11px] font-normal leading-[1.6]", "text-muted-foreground tabular-nums"],
        },
        actionBarTitleTextContainer: {
            class: ["flex flex-col my-4"],
        },
        savingOptionButtons: {
            class: ["flex items-center gap-2 justify-center mx-4 mb-4 print:hidden"],
        },
        savingOptionButton: {
            class: ["min-w-[120px]"],
        },
        emptyActions: {
            class: ["flex flex-col sm:flex-row gap-2 justify-center"],
        },
        actionBar: {
            class: ["flex flex-col gap-2 justify-center min-w-min print:hidden"],
        },
    },
};
