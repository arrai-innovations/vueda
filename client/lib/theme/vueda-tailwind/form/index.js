export default {
    FieldSetMany: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        header: {
            class: ["flex", "items-center", "justify-between"],
        },
        row: {
            class: ["flex", "flex-wrap", "gap-2", "flex-row"],
        },
        component: {
            class: ["w-5/6"],
        },
        createButton: {
            class: [],
        },
    },
    FieldSetRange: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-row flex-wrap gap-2"],
        },
        header: {
            class: ["flex items-baseline gap-2"],
        },
        title: {
            class: "ml-2 leading-7 text-surface-900 dark:text-white text-lg",
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
    },
    FieldSetStackedInline: {
        root: {
            class: [],
        },
        inner: {
            class: ["divide-y divide-dashed hover:divide-solid"],
        },
        outer: {
            class: ["flex items-baseline gap-2"],
        },
        header: {
            class: "ml-2 leading-7",
        },
        title: {
            class: "text-surface-900 dark:text-white",
        },
        hr: {
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2 my-2",
        },
        inlineRows: {
            class: [],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        fieldInner: {
            class: [],
        },
        createButton: {
            class: "grow",
        },
    },
    FieldSetStackedInlineRow: {
        root: {
            class: [],
        },
        beforeFields: {
            class: [],
        },
        afterFields: {
            class: [],
        },
        fieldInner: {
            class: [],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        destroyOuter: {
            class: ["flex py-2"],
        },
    },
    FieldSetTabularInline: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        dividerContent: {
            class: ["flex flex-row items-baseline justify-between gap-1 md:gap-2 2xl:gap-4"],
        },
        hr: {
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2 my-2",
        },
        titleBar: {
            class: "ml-2 leading-7 flex items-baseline gap-2 md:gap-4",
        },
        title: {
            class: ["text-surface-900 dark:text-white"],
        },
        actionBar: {
            class: "grow-0 flex gap-2",
        },
        itemActionBar: {
            class: "flex gap-2 items-baseline",
        },
        objectsGrid: {
            class: "w-full",
        },
        objectsGridHidden: {
            class: "hidden",
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2",
                "min-w-1",
            ],
        },
        fieldInner: {
            class: [],
        },
        createButton: {
            class: [],
        },
        toggleButton: {
            class: [],
        },
        themeOverride: {
            ObjectsGridBodyCell: {
                root: {
                    class: "min-w-36",
                },
            },
        },
    },
    FilterForm: {
        dialog: {
            class: "w-64",
        },
        form: {
            class: "flex flex-col gap-2",
        },
        fieldContainer: {
            class: "mb-2",
        },
        fieldLabel: {
            class: [],
        },
        fieldInput: {
            class: "rounded border border-surface-300 dark:border-surface-600 p-2",
        },
        submitButton: {
            class: "whitespace-nowrap",
        },
        createButtonContainer: {
            class: "flex justify-end mt-2",
        },
        filterListContainer: {
            class: "flex flex-wrap gap-1 my-1",
        },
        filterButton: {
            class: "grow sm:grow-0",
        },
        errorDisplay: {
            class: "mb-2",
        },
        hr: {
            class: "flex-1 border-primary-300 dark:border-primary-600 border-t",
        },
        message: {
            class: "text-red-600 dark:text-red-400",
        },
    },
    FormChores: {
        root: {
            class: [""],
        },
        item: {
            class: ["grow"],
        },
    },
    FormHelpText: {
        root: ({ variant }) => ({
            class: [variant === "simple" ? "mx-2" : "", "my-2"],
        }),
    },
    FormFeedback: {
        root: ({ variant }) => ({
            class: [variant === "simple" ? "mx-2" : "", "my-2"],
        }),
        messages: {
            class: ["flex flex-col gap-1 md:gap-2 2xl:gap-4"],
        },
    },
    FormModel: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        beforeFields: {
            class: [],
        },
        afterFields: {
            class: [],
        },
        fields: {
            class: [],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        fieldInner: {
            class: [],
        },
    },
    FormHiddenFeedback: {
        root: {
            class: "min-w-min",
        },
        popoverBody: {
            class: "flex flex-col gap-1 md:gap-2 2xl:gap-4",
        },
        popoverItem: {
            class: [],
        },
        button: {
            class: [],
        },
        icon: {
            class: [],
        },
        required: {
            class: [],
        },
        errors: {
            class: [],
        },
        warnings: {
            class: [],
        },
        help: {
            class: [],
        },
    },
};
