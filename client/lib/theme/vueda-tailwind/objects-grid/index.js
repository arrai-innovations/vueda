/**
 * @module theme/vueda-tailwind/objects-grid
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client ObjectsGrid and related table/card components.
 */

export default {
    ObjectsGrid: {
        root: {
            class: [
                "max-w-full overflow-x-auto",
                "rounded-vueda-card border border-border bg-card text-foreground text-body",
                "[font-variant-numeric:tabular-nums_slashed-zero]",
            ],
        },
        table: {
            class: ({ isTable }) => [
                {
                    "!table border-separate border-spacing-0 overflow-x-auto max-w-full": isTable,
                },
            ],
        },
        headerRowGroup: {
            class: ({ isTable }) => [
                "gap-1 2xs:gap-2 2xl:gap-4",
                {
                    "!table-header-group": isTable,
                    hidden: !isTable,
                },
            ],
        },
        headerRow: {
            class: ({ isTable }) => [{ "!table-row": isTable }],
        },
        headerCell: {
            class: ({ isTable }) => [
                "align-bottom",
                "font-semibold",
                "select-none",
                "data-[numeric]:text-right",
                {
                    "!table-cell": isTable,
                },
            ],
        },
        emptyText: {
            class: ["text-center"],
        },
        bodyRowGroup: {
            class: ({ isTable }) => [
                "print:block",
                {
                    // don't add grid-cols-x here.
                    // projects should set their own via theme-override
                    // as appropriate for their individual cases.
                    "grid grid-flow-row p-1 2xs:p-2 2xl:p-4 gap-1 2xs:gap-2 2xl:gap-4": !isTable,
                    "!table-row-group": isTable,
                },
            ],
        },
        bodyRow: {
            class: ({ isTable }) => {
                return [
                    "group/row transition-colors",
                    "hover:bg-muted/50",
                    "data-[state=selected]:bg-primary/[0.06] data-[state=selected]:hover:bg-primary/[0.09]",
                    "data-[state=selected]:[box-shadow:inset_2px_0_0_0_var(--primary)]",
                    // you can't tell how many cards are on a row, so we must treat them all the same.
                    // first and last don't help us here.
                    {
                        "!table-row": isTable,
                        "p-1 2xs:p-2 2xl:p-4 rounded-md border 2xs:border-2 overflow-y-auto": !isTable,
                    },
                ];
            },
        },
        cardContainer: {
            class: "p-1 2xs:p-2 2xl:p-4 gap-1 2xs:gap-2 2xl:gap-4 mb-1 mt-2 flex flex-col [&>*]:min-w-0",
        },
        rowActions: {
            root: {
                class: [
                    "inline-flex gap-0.5 invisible",
                    "group-hover/row:visible group-focus-within/row:visible group-data-[state=selected]/row:visible",
                ],
            },
            action: {
                class: [
                    "inline-flex items-center justify-center size-6 rounded-vueda-control",
                    "border border-transparent text-muted-foreground text-[11px]",
                    "hover:bg-muted hover:text-foreground hover:border-border",
                    "focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                ],
            },
        },
    },
    ObjectsGridTableHeader: {
        root: {
            class: ({ props: { sortable } }) => [
                "flex",
                "items-end",
                "justify-between",
                "py-1 px-2",
                "[[data-numeric]_&]:flex-row-reverse",
                {
                    "cursor-pointer": sortable,
                    "hover:bg-neutral-600 dark:hover:bg-neutral-300": sortable,
                    "hover:text-white dark:hover:text-neutral-900": sortable,
                    "hover:rounded": sortable,
                },
            ],
        },
        label: {
            class: {},
        },
        sortIcon: {
            class: ["pl-1", "text-center"],
        },
        multiSortNumber: {
            class: [
                "inline-flex items-center justify-center",
                "min-w-[14px] h-[14px] px-1 ml-1 rounded-vueda-control",
                "bg-[color-mix(in_oklab,var(--muted-foreground)_18%,transparent)] text-muted-foreground",
                "font-mono text-[9px] font-semibold tracking-[0.04em]",
            ],
        },
    },
    ObjectsGridCardCell: {
        header: {
            class: ["self-baseline", "text-neutral-900 dark:text-white", "font-semibold", "select-none"],
        },
        value: {
            class: ["self-baseline", "text-neutral-800 dark:text-neutral-200", "font-normal"],
        },
    },
    ObjectsGridBodyCell: {
        root: {
            class: [
                "align-middle",
                "text-foreground",
                "font-normal",
                "px-1 lg:px-2",
                "table-cell",
                "whitespace-nowrap",
                "[[data-density=default]_&]:h-8 [[data-density=default]_&]:py-1.5",
                "[[data-density=compact]_&]:h-7 [[data-density=compact]_&]:py-1",
                "[[data-density=condensed]_&]:h-6 [[data-density=condensed]_&]:py-0.5 [[data-density=condensed]_&]:text-xs",
                "data-[numeric]:text-right data-[numeric]:font-mono",
                "data-[mono]:font-mono",
            ],
        },
        themeOverride: {
            WidgetLabel: {
                root: {
                    class: {
                        "ml-2 mb-1": false,
                    },
                },
            },
        },
    },
};
