export default {
    PageTitle: {
        root: ({ headerClass, sticky }) => ({
            class: [
                headerClass,
                {
                    "sticky top-0 z-30": sticky,
                },
            ],
        }),
        container: {
            class: ["flex flex-col gap-1 my-1"],
        },
        titleContainer: {
            class: [
                "w-full flex",
                "sm:flex-row sm:justify-between",
                "items-baseline justify-between",
                "gap-2 md:gap-4",
            ],
        },
        titleWrapper: {
            class: ["flex items-baseline flex-wrap", "min-w-min"],
        },
        title: {
            class: ["font-bold leading-relaxed text-3xl"],
        },
        spacer: {
            class: ["flex-1 min-w-6", "hidden sm:block", "border-primary-300 dark:border-primary-600 border-t-2"],
        },
        divider: {
            class: ["block sm:hidden", "border-primary-300 dark:border-primary-600 border-t-2"],
        },
        buttons: {
            class: ["flex gap-1 flex-wrap", "justify-end", "self-center"],
        },
        subtitleContainer: {
            class: ["w-full flex flex-wrap", "items-baseline justify-between", "gap-2 md:gap-4 lg:gap-7"],
        },
        footer: {
            class: [],
        },
        gradient: {
            class: ["w-full h-2 md:h-3 lg:h-4"],
        },
    },
    ActionForm: {
        root: {
            class: [],
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
            class: ["flex flex-col lg:flex-row gap-1 md:gap-2 flex-wrap lg:flex-nowrap"],
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
            class: ["w-full"],
        },
        objectsGrid: {
            class: ["w-full"],
        },
        underActionsBar: {
            class: ["w-full flex flex-col sm:flex-row sm:justify-between gap-1 mb-1"],
        },
        actionButtonGroupBar: {
            class: ["flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"],
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
    ViewAction: {
        root: {
            class: [],
        },
    },
};
