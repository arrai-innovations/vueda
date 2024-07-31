export default {
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
            "text-white",
            "bg-surface-900 dark:bg-surface-500",
            "align-middle",
            "px-1 lg:px-2",
            "font-semibold not-italic",
            "select-none",
            "first:rounded-tl",
            "last:rounded-tr",
            {
                "!table-cell": isTable,
                "h-[3.5rem] py-2": isTable,
            },
        ],
    },
    sort: {
        class: [
            "p-1",
            "ml-1",
            "bg-surface-600",
            "text-white",
            "dark:bg-surface-300",
            "dark:text-material-black",
            "rounded",
        ],
    },
    sortNum: {
        class: ["mx-1"],
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
    bodyCell: {
        class: ({ isTable }) => [
            "align-middle text-surface-800 dark:text-surface-200 font-normal not-italic",
            "border-surface-200 dark:border-surface-700",
            "px-1 lg:px-2",
            {
                "!table-cell": isTable,
                "h-[3.5rem]": isTable,
                hidden: !isTable,
            },
        ],
    },
    cardCell: {
        class: ({ isTable }) => [
            "gap-2",
            "p-2",
            "2xs:grid",
            "2xs:gap-4",
            "2xs:grid-cols-2",
            "2xs:grid-flow-row",
            "sm:flex",
            "sm:flex-col",
            { "!hidden": isTable },
        ],
    },
    cardHeader: {
        class: [
            "align-middle border-surface-200  dark:border-surface-700 text-material-black dark:text-white" +
                " font-semibold not-italic pl-1 pr-3 select-none",
        ],
    },
    cardValue: {
        class: [
            "align-middle border-surface-200 dark:border-surface-700" +
                " text-surface-800 dark:text-surface-200 font-normal not-italic",
        ],
    },
};
