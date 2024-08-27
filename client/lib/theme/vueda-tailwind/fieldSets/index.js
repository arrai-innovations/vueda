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
        component: {
            class: ["flex", "flex-wrap", "items-center"],
        },
    },
    FieldSetRange: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col [&_input]:w-full"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
};
