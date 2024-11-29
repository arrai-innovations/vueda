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
            class: ["flex flex-col gap-1 mt-1"],
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
            class: ["flex gap-1 flex-wrap", "justify-end"],
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
            class: ["gap-1 mt-1 prose dark:prose-invert"],
        },
        selectedObjects: {
            class: [],
        },
        message: {
            class: [],
        },
        buttons: {
            class: ["flex flex-col lg:flex-row mx-2 gap-2 mb-2 flex-wrap lg:flex-nowrap"],
        },
        list: {
            class: ["list-inner divide-y"],
        },
    },
    ViewList: {
        selectedCheckbox: {
            // match to ViewList's tableBreakpoint
            // can't have dynamic tailwind classes, 'unused' classes are purged
            class: ["lg:w-0"],
        },
    },
    ViewHistoryList: {
        root: {
            class: [],
        },
    },
};
