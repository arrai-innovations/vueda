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
            class: ({ isTable, evenCard, tableBreakpoint }) => [
                // you can't tell how many cards are on a row, so we must treat them all the same.
                // first and last don't help us here.
                {
                    "max-md:rounded": tableBreakpoint === "md",
                },
                {
                    "max-lg:rounded": tableBreakpoint === "lg",
                },
                {
                    "bg-surface-50 dark:bg-surface-900": !evenCard,
                    "bg-surface-100 dark:bg-surface-800": evenCard,
                    "!table-row": isTable,
                },
            ],
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
            class: [
                "gap-2",
                "p-2",
                "2xs:grid",
                "2xs:gap-4",
                "2xs:grid-cols-2",
                "2xs:grid-flow-row",
                "sm:flex",
                "sm:flex-col",
            ],
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
                "h-[3.5rem]",
            ],
        },
        value: {
            class: [],
        },
    },
};
