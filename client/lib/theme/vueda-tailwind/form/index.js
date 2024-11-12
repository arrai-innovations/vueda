export default {
    FieldSetMany: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col [&_input]:w-full"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
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
            class: "ml-3 leading-7 text-surface-900 dark:text-white text-lg",
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        field: {
            class: ["rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"],
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
            class: "ml-3 leading-7",
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
            class: ["rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"],
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
            class: ["rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"],
        },
        deleteOuter: {
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
        hr: {
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2 my-2",
        },
        titleBar: {
            class: "ml-3 leading-7 flex items-baseline gap-2 md:gap-4",
        },
        title: {
            class: ["text-surface-900 dark:text-white"],
        },
        actionBar: {
            class: "grow-0 flex gap-2",
        },
        field: {
            class: ["rounded", "px-1 lg:px-2 py-1 lg:py-2", "min-w-1"],
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
            class: "w-full rounded border border-surface-300 dark:border-surface-600 p-2",
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
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t",
        },
        message: {
            class: "text-red-600 dark:text-red-400",
        },
    },
    FormHelpText: {
        root: {
            class: ["my-2"],
        },
    },
    FormFeedback: {
        root: {
            class: ["my-2"],
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
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
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
            class: ["rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"],
        },
        fieldInner: {
            class: [],
        },
    },
};
