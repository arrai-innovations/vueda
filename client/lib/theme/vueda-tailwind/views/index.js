/**
 * @module theme/vueda-tailwind/views
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client page and view-level components.
 */

export default {
    PageTitle: {
        root: ({ headerClass, sticky }) => ({
            class: [
                "border-b border-border",
                headerClass,
                {
                    "sticky top-0 z-30": sticky,
                },
            ],
        }),
        container: {
            class: ["flex flex-col"],
        },
        titleContainer: {
            class: [
                "w-full flex",
                "sm:flex-row sm:justify-between",
                "items-baseline justify-between",
                "gap-2 md:gap-4",
                "px-5 py-3",
            ],
        },
        titleWrapper: {
            class: ["flex flex-col gap-1", "min-w-min"],
        },
        eyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        titleRow: {
            class: ["flex items-baseline flex-wrap gap-2"],
        },
        title: {
            class: ["text-[22px] font-semibold leading-[1.2] tracking-[-0.005em]"],
        },
        titleSuffix: {
            class: ["text-muted-foreground text-[13px]/[1.4] font-normal font-mono"],
        },
        buttons: {
            class: ["flex gap-1 flex-wrap", "justify-end", "self-center"],
        },
        subtitleContainer: {
            class: [
                "w-full flex flex-wrap",
                "items-baseline justify-between",
                "gap-2 md:gap-4 lg:gap-7",
                "bg-muted/25 border-t border-border px-5 py-[10px]",
            ],
        },
        footer: {
            class: [],
        },
        gradient: {
            class: ["w-full h-3"],
        },
    },
    ActionForm: {
        root: {
            class: ["max-w-7xl"],
        },
        inner: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4"],
        },
        selectedObjects: {
            class: [],
        },
        message: {
            class: [],
        },
        // Pinned actions strip: horizontal row with a top hairline and a tinted-muted bg
        // closing the card body. Wraps on narrow viewports rather than stacking column.
        buttons: {
            class: [
                "flex flex-row flex-wrap items-center gap-2",
                "px-4 py-3 mt-2",
                "border-t border-border bg-muted/25",
                "rounded-b-vueda-card",
            ],
        },
        buttonsSpacer: {
            class: ["flex-1 min-w-0"],
        },
        buttonsHint: {
            class: ["ml-auto text-[12px] leading-none text-muted-foreground", "inline-flex items-center gap-1.5"],
        },
        list: {
            class: ["flex flex-col gap-1 md:gap-2 lg:max-w-max"],
        },
        listItem: {
            class: [],
        },
        nonFieldErrorBlock: {
            // class: ["max-w-full overflow-x-auto p-1 2xs:p-2 2xl:p-4 flex flex-col gap-2"],
            class: "",
        },
        // Structured per-field validation alert. Renders when formContext.state.anyError
        // is set and at least one field carries an error. Tone tracks danger via
        // data-tone="danger" on the alert root; routed through Tailwind v4
        // `group-data-[tone=danger]/action-form-validation:` if needed by future skins.
        validation: {
            class: [
                "flex items-start gap-3 p-3 mb-2",
                "rounded-vueda-card border border-destructive/40",
                "bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)]",
            ],
        },
        validationIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-full bg-destructive text-destructive-foreground",
                "text-[18px] leading-none",
            ],
        },
        validationBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        validationTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        validationDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        validationList: {
            class: ["flex flex-col gap-0.5 m-0 mt-1 p-0 list-none"],
        },
        validationListItem: {
            class: ["flex items-baseline gap-2 text-[12px] leading-[1.5]"],
        },
        validationField: {
            class: ["font-mono text-[11.5px] font-medium text-foreground shrink-0"],
        },
        validationMsg: {
            class: ["text-[12px] font-normal text-muted-foreground"],
        },
    },
    ModelActionForm: {
        root: {
            class: [],
        },
        // Bare wrapper used when the form is embedded in an outer toned card
        // (e.g. ViewDestroy). No card chrome; chip-row tone routing still works
        // via the parent group scope.
        bare: {
            class: ["contents"],
        },
        // Canonical confirmation card. Opens a `group/model-action-form` named
        // group so descendants can opt into tone via
        // `group-data-[tone=…]/model-action-form:` variants. data-tone on the
        // root drives info / success / warning / danger / neutral accents.
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
        // Tone-tracked banner. Background and border tint route from the card's
        // data-tone via group-data-[tone=…]/model-action-form: variants.
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
        bannerBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        bannerTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        bannerDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        // Optional mono meta strip below the description. OBS-011 mono recipe
        // for machine-readable values; OBS-015 eyebrow letter-spacing.
        bannerMeta: {
            class: ["font-mono text-[11px] font-normal leading-[1.5] tracking-[0.04em]", "text-muted-foreground"],
        },
        body: {
            class: ["p-4 flex flex-col gap-3"],
        },
        inner: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4 mt-1"],
        },
        // Selected-objects panel: tinted-muted bg, hairline, rounded card radius.
        // Tone routing routes destructive when nested in a danger card (either
        // the surrounding ViewDestroy or the ModelActionForm itself).
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
        // Eyebrow head: label + count, separated. OBS-015 eyebrow recipe.
        selectedHead: {
            class: ["flex flex-row items-baseline justify-between flex-wrap gap-2"],
        },
        selectedHeadCount: {
            class: ["font-mono text-[11px] font-normal leading-none tabular-nums", "text-muted-foreground"],
        },
        selectedObjectsLabel: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        // Confirm-prompt panel: tinted-muted bg with a 2px primary left rule.
        // Multi-paragraph guidance accommodated via flex-col on the inner.
        message: {
            class: [
                "flex flex-col gap-1.5",
                "rounded-vueda-control bg-muted/25",
                "border-l-2 border-primary/60",
                "px-3 py-2.5",
            ],
        },
        messageText: {
            class: ["text-[13px] leading-[1.5] text-foreground m-0"],
        },
        // Extra-fields slot below the prompt; standard form-field stack.
        extraFields: {
            class: ["flex flex-col gap-3"],
        },
        buttons: {
            class: ["flex flex-col lg:flex-row gap-1 md:gap-2 flex-wrap lg:flex-nowrap"],
        },
        // Chip-row dialect (Group D names retained for backwards compat with
        // ViewDestroy; complement keys `selectedHead` / `selectedHeadCount`
        // added above to align with the kit's preferred recipe).
        list: {
            class: ["flex flex-row flex-wrap gap-2"],
        },
        listItem: {
            class: [
                "inline-flex items-center gap-2 px-2 py-1 rounded-vueda-control",
                "border border-border bg-card",
                "text-[12px] font-medium text-foreground leading-none",
                "group-data-[tone=danger]/view-destroy:border-destructive/40 group-data-[tone=danger]/view-destroy:bg-card",
                "group-data-[tone=danger]/model-action-form:border-destructive/40 group-data-[tone=danger]/model-action-form:bg-card",
            ],
        },
        listItemLabel: {
            class: ["text-[12px] font-medium text-foreground leading-none"],
        },
        listItemPk: {
            class: [
                "text-[11px] font-normal font-mono text-muted-foreground leading-none",
                "group-data-[tone=danger]/view-destroy:text-destructive/80",
                "group-data-[tone=danger]/model-action-form:text-destructive/80",
            ],
        },
        nonFieldErrorBlock: {
            // class: ["max-w-full overflow-x-auto p-1 2xs:p-2 2xl:p-4 flex flex-col gap-2"],
            class: "",
        },
    },
    ViewDestroy: {
        root: {
            class: [],
        },
        card: {
            class: [
                "group/view-destroy",
                "rounded-vueda-card border bg-card overflow-hidden",
                "border-destructive/50",
                "shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_8%,transparent)]",
            ],
        },
        banner: {
            class: ["flex items-start gap-3 p-4", "border-b border-destructive/20 bg-destructive/[0.06]"],
        },
        bannerIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-full bg-destructive text-destructive-foreground",
                "text-[18px] font-semibold leading-none",
            ],
        },
        bannerBody: {
            class: ["flex flex-col gap-1 min-w-0"],
        },
        bannerTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        bannerDescription: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        bannerCountsList: {
            class: ["flex flex-col gap-0.5 m-0 p-0 list-none"],
        },
        bannerCountsItem: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        body: {
            class: ["p-4"],
        },
    },
    AuthForm: {
        root: {
            class: ["flex min-h-full flex-col"],
        },
        outer: {
            class: ["flex flex-col max-w-full"],
        },
        inner: {
            class: [
                "p-8 rounded border bg-zinc-0 dark:bg-zinc-950 flex flex-col items-stretch gap-3 overflow-y-auto max-w-full sm:w-[35rem]",
            ],
        },
        contentContainer: {
            class: ["min-w-min"],
        },
        title: {
            class: ["prose dark:prose-invert mt-5"],
        },
    },
    AuthorizingForm: {
        root: {
            class: ["flex min-h-full justify-center items-center"],
        },
        outer: {
            class: ["flex flex-col max-w-full"],
        },
        inner: {
            class: [
                "p-8 rounded border bg-zinc-0 dark:bg-zinc-950 flex flex-col items-stretch gap-3 overflow-y-auto max-w-full sm:w-[35rem]",
            ],
        },
        contentContainer: {
            class: ["min-w-min"],
        },
        title: {
            class: ["prose dark:prose-invert mt-5"],
        },
    },
    ViewList: {
        selectedCheckbox: {
            // match to ViewList's tableBreakpoint
            // can't have dynamic tailwind classes, 'unused' classes are purged
            class: ["lg:w-0"],
        },
        searchInput: {
            class: ["lg:max-w-[30ch]"],
        },
        bulkActionButton: {
            class: ["grow sm:grow-0"],
        },
        targetlessActionButton: {
            class: [],
        },
        filterGroupBar: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-[10px] border-b border-border bg-muted/25"],
        },
        filterGroupBarEyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        sortComponentDiv: {
            class: ["flex flex-row justify-end ml-auto"],
        },
        objectsGrid: {
            class: ["w-full border-0 rounded-none"],
        },
        underActionsBar: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-3 border-b border-border bg-card"],
        },
        bulkActionsBar: {
            class: [
                "w-full flex items-center flex-wrap gap-[10px] px-5 py-[10px]",
                "border-b border-border bg-primary/[0.06] text-[12px] font-medium",
            ],
        },
        actionButtonGroupBar: {
            class: ["flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"],
        },
        listControlBar: {
            class: ["flex flex-row gap-1 2xl:gap-2 ml-auto"],
        },
        columnTotalCell: {
            class: "border-t-2",
        },
    },
    ViewHistoryList: {
        root: {
            class: [],
        },
        // Revision-grouped row binding: 2px primary left-stripe on the first cell of every
        // row that belongs to a revision (start + child rows). Suppresses ObjectsGrid's own
        // border so the parent card carries chrome.
        row: {
            class: [
                "data-[rev-start=true]:[&>*:first-child]:border-l-2",
                "data-[rev-start=true]:[&>*:first-child]:border-primary",
                "data-[rev-child=true]:[&>*:first-child]:border-l-2",
                "data-[rev-child=true]:[&>*:first-child]:border-primary",
            ],
        },
        // Old/new diff cells: leading glyph, faint tonal background, mono font for whitespace
        // and unicode preservation.
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
        // Dedicated empty state: clock-in-circle on a tinted muted bg, title + description.
        empty: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-12 px-6 text-center",
                "rounded-vueda-card border border-border bg-card",
            ],
        },
        emptyIcon: {
            class: [
                "flex items-center justify-center",
                "w-10 h-10 rounded-full bg-muted/50 text-muted-foreground",
                "text-[16px] leading-none",
            ],
        },
        emptyTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        emptyDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        // Two-line history-date cell: absolute timestamp on top, relative phrase below.
        cellDate: {
            class: ["text-[12px] leading-[1.3] text-foreground"],
        },
        cellDateRel: {
            class: ["text-[11px] leading-[1.3] text-muted-foreground"],
        },
        // history-user cell: 22 px UserAvatar chip + name beside it (PROP-156).
        // Name is 12 px / 500 / foreground per kit recipe.
        cellUser: {
            class: ["inline-flex items-center gap-2"],
        },
        cellUserName: {
            class: ["text-[length:var(--vueda-text-supporting)] font-medium leading-tight text-foreground"],
        },
    },
    ViewNotFound: {
        root: {
            class: [],
        },
        title: {
            class: [],
        },
    },
    ViewActionNotFound: {
        root: {
            class: [],
        },
        title: {
            class: [],
        },
        description: {
            class: [],
        },
        suggestions: {
            class: [],
        },
        link: {
            class: [],
        },
    },
    ViewAction: {
        root: {
            class: [],
        },
    },
    ViewActivate: {
        root: {
            class: [],
        },
    },
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
        radioOption: {
            class: ["flex items-center gap-2"],
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
