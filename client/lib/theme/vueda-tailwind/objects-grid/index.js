export default {
    ObjectsGrid: {
        root: {
            class: ({ isTable }) => ["mb-2 md:mb-4 lg:mb-7", { "!table": isTable }],
        },
        headerRowGroup: {
            class: ({ isTable }) => [
                "gap-4",
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
                // "text-white",
                // "bg-surface-900 dark:bg-surface-500",
                // "align-middle",
                "align-bottom",
                "font-semibold",
                "select-none",
                // "first:rounded-tl",
                // "last:rounded-tr",
                {
                    "!table-cell": isTable,
                },
            ],
        },
        bodyRowGroup: {
            class: ({ isTable }) => [
                "screen:grid",
                "gap-4",
                "sm:grid-cols-2",
                "md:grid-cols-3",
                "lg:grid-cols-4",
                "grid-flow-row",
                {
                    "!table-row-group": isTable,
                },
            ],
        },
        emptyText: {
            class: ["text-center"],
        },
        bodyRow: {
            class: ({ isTable, tableBreakpoint }) => {
                return [
                    // you can't tell how many cards are on a row, so we must treat them all the same.
                    // first and last don't help us here.
                    {
                        "max-md:rounded max-md:gap-2 max-md:p-2 max-md:flex max-md:flex-col max-md:flex-wrap max-md:[&>*]:flex-1 max-md:[&>*]:flex-grow max-md:[&>*]:min-w-min":
                            tableBreakpoint === "md",
                        "max-lg:rounded max-lg:gap-2 max-lg:p-2 max-lg:flex max-lg:flex-col max-lg:flex-wrap max-lg:[&>*]:flex-1 max-lg:[&>*]:flex-grow max-lg:[&>*]:min-w-min":
                            tableBreakpoint === "lg",
                        "max-xl:rounded max-xl:gap-2 max-xl:p-2 max-xl:flex max-xl:flex-col max-xl:flex-wrap max-xl:[&>*]:flex-1 max-xl:[&>*]:flex-grow max-xl:[&>*]:min-w-min":
                            tableBreakpoint === "xl",
                        "max-2xl:rounded max-2xl:gap-2 max-2xl:p-2 max-2xl:flex max-2xl:flex-col max-2xl:flex-wrap max-2xl:[&>*]:flex-1 max-2xl:[&>*]:flex-grow max-2xl:[&>*]:min-w-min":
                            tableBreakpoint === "2xl",
                        // "bg-surface-50 dark:bg-surface-900": !evenCard,
                        // "bg-surface-100 dark:bg-surface-800": evenCard,
                        "border-2 border-surface-200 dark:border-surface-700": true,
                        "overflow-y-auto": true,
                        "!table-row": isTable,
                    },
                ];
            },
        },
    },
    ObjectsGridTableHeader: {
        root: {
            class: ({ sortable }) => [
                "flex",
                "items-end",
                "justify-between",
                "py-1 px-2",
                {
                    "cursor-pointer": sortable,
                    "hover:bg-surface-600 dark:hover:bg-surface-300": sortable,
                    "hover:text-white dark:hover:text-material-black": sortable,
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
            class: {},
        },
    },
    ObjectsGridCardCell: {
        root: {
            class: ["gap-2", "p-2"],
        },
        header: {
            class: [
                "align-middle",
                "border-surface-200 dark:border-surface-700",
                "text-material-black dark:text-white",
                "font-semibold",
                "pl-1 pr-3",
                "select-none",
            ],
        },
        value: {
            class: [
                "align-middle",
                "border-surface-200 dark:border-surface-700",
                "text-surface-800 dark:text-surface-200",
                "font-normal",
            ],
        },
    },
    ObjectsGridBodyCell: {
        root: {
            class: [
                "align-middle",
                "text-surface-800 dark:text-surface-200",
                "font-normal",
                "border-surface-200 dark:border-surface-700",
                "px-1 lg:px-2",
                "table-cell",
                "min-w-36",
                "h-[3.5rem]",
            ],
        },
    },
};
