export default {
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
            class: [
                "rounded bg-gradient-to-b from-surface-100 via-transparent via-[1rem] dark:from-surface-800 dark:via-transparent dark:via-[1rem]",
                "px-1 lg:px-2 py-1 lg:py-2",
                "mb-2 lg:mb-4",
            ],
        },
        fieldInner: {
            class: [],
        },
    },
    FieldInline: {
        root: {
            class: [],
        },
        header: {
            class: ["flex items-baseline gap-2"],
        },
        title: {
            class: "ml-3 leading-7 text-surface-900 dark:text-white text-lg",
        },
        hr: {
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2 my-2",
        },
        inlineRows: {
            class: [],
        },
    },
    FieldInlineRow: {
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
                "rounded bg-gradient-to-b from-surface-100 via-transparent via-[1rem] dark:from-surface-800 dark:via-transparent dark:via-[1rem]",
                "px-1 lg:px-2 py-1 lg:py-2",
                "mb-2 lg:mb-4",
            ],
        },
    },
};
