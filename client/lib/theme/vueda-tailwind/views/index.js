export default {
    PageTitle: {
        root: ({ props }) => ({
            class: [
                props.headerClass,
                {
                    "sticky top-0 z-30": props.sticky,
                },
            ],
        }),
        container: {
            class: "bg-surface-0 dark:bg-surface-950 flex flex-col gap-1 mt-1",
        },
        titleContainer: {
            class: "w-full flex flex-col sm:flex-row sm:justify-between items-baseline gap-2 md:gap-4 lg:gap-7",
        },
        titleWrapper: {
            class: "w-full sm:w-auto flex items-baseline",
        },
        title: {
            class: "font-bold leading-relaxed text-3xl",
        },
        divider: {
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2",
        },
        buttons: {
            class: "flex flex-col sm:flex-row gap-1 self-start w-full sm:w-auto",
        },
        subtitleContainer: {
            class: "w-full flex flex-col sm:flex-row sm:justify-between items-baseline gap-2 md:gap-4 lg:gap-7",
        },
        footer: {
            class: "pt-4 border-t border-surface-200 dark:border-surface-700",
        },
        gradient: {
            class: "w-full h-2 md:h-3 lg:h-4 bg-gradient-to-b from-surface-0 to-transparent dark:from-surface-950 dark:to-transparent",
        },
    },
    ActionForm: {
        root: {
            class: [],
        },
        inner: {
            class: ["gap-1 mt-1"],
        },
        bodyContainer: {
            class: [],
        },
        buttonGroup: {
            class: ["flex flex-row lg:flex-col mx-2 gap-2 mb-2 flex-wrap lg:flex-nowrap"],
        },
    },
    ViewHistoryList: {
        nestedRowGroup: {
            class: ["divide-y divide-double px-0 lg:px-0"],
        },
        nestedRow: {
            class: ["h-[2.5rem] content-center width: 100% px-1 lg:px-2"],
        },
        cardFieldClasses: {},
    },
};
