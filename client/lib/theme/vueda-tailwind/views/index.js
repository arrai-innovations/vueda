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
            class: [
                "max-w-7xl",
                "bg-accent/30 border border-border rounded-vueda-card p-4",
                "shadow-[inset_3px_0_0_var(--ring)]",
            ],
        },
        inner: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4 mt-1"],
        },
        selectedObjects: {
            class: [],
        },
        message: {
            class: [],
        },
        buttons: {
            class: ["flex flex-col lg:flex-row gap-1 md:gap-2 flex-wrap lg:flex-nowrap pt-4"],
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
    },
    ModelActionForm: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4 mt-1"],
        },
        selectedObjects: {
            class: [
                "rounded-vueda-card bg-muted/25 border border-border p-3",
                "flex flex-col gap-2",
                // When the surrounding ViewDestroy card is in danger tone, tint the
                // selected-records container with a destructive wash + hairline.
                "group-data-[tone=danger]/view-destroy:bg-destructive/[0.06] group-data-[tone=danger]/view-destroy:border-destructive/40",
            ],
        },
        selectedObjectsLabel: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        message: {
            class: [],
        },
        buttons: {
            class: ["flex flex-col lg:flex-row gap-1 md:gap-2 flex-wrap lg:flex-nowrap"],
        },
        list: {
            class: ["flex flex-row flex-wrap gap-2"],
        },
        listItem: {
            class: [
                "inline-flex items-center gap-2 px-2 py-1 rounded-vueda-control",
                "border border-border bg-card",
                "text-[12px] font-medium text-foreground leading-none",
                // Danger tone tints chip text + border with destructive when the
                // surrounding card is in danger context.
                "group-data-[tone=danger]/view-destroy:border-destructive/40 group-data-[tone=danger]/view-destroy:bg-card",
            ],
        },
        listItemLabel: {
            class: ["text-[12px] font-medium text-foreground leading-none"],
        },
        listItemPk: {
            class: [
                "text-[11px] font-normal font-mono text-muted-foreground leading-none",
                "group-data-[tone=danger]/view-destroy:text-destructive/80",
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
    ViewTwoFactorAuth: {
        root: {
            class: [],
        },
        buttons: {
            class: ["flex flex-col gap-2 pt-4"],
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
