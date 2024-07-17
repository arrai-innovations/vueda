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
};
