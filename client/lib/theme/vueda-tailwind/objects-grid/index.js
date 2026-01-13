export default {
    ObjectsGrid: {
        root: {
            class: ["max-w-full overflow-x-auto"],
        },
        table: {
            class: ({ isTable }) => [
                {
                    "!table overflow-x-auto max-w-full": isTable,
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
                "screen:grid",
                "p-1 2xs:p-2 2xl:p-4 gap-1 2xs:gap-2 2xl:gap-4",
                // don't add grid-cols-x here.
                // projects should set their own via theme-override
                // as appropriate for their individual cases.
                "grid-flow-row",
                {
                    "!table-row-group": isTable,
                },
            ],
        },
        // bodyRow: {
        //     class: "",
        // },
        bodyRow: {
            class: ({ isTable }) => {
                return [
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
    },
    ObjectsGridTableHeader: {
        root: {
            class: ({ props: { sortable } }) => [
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
        header: {
            class: ["self-baseline", "text-material-black dark:text-white", "font-semibold", "select-none"],
        },
        value: {
            class: ["self-baseline", "text-surface-800 dark:text-surface-200", "font-normal"],
        },
    },
    ObjectsGridBodyCell: {
        root: {
            class: [
                "align-middle",
                "text-surface-800 dark:text-surface-200",
                "font-normal",
                "px-1 lg:px-2",
                "table-cell",
                "h-[3.5rem]",
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
