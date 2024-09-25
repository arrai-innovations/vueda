export default {
    WidgetAutoComplete: {
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
    WidgetGenericAutoComplete: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-row gap-2 flex-wrap [&_input]:w-full"],
        },
        dropdownOuter: {
            class: ["flex flex-col flex-shrink"],
        },
        autoCompleteOuter: {
            class: ["flex flex-col flex-grow"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetMultiSelect: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetSearchableSelect: {
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
    WidgetCheckbox: {
        root: {
            class: ["ml-3"],
        },
        inner: {
            class: ["flex"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetDuration: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-row gap-2 flex-wrap [&_input]:w-full"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        innerItem: {
            class: ["flex flex-col flex-grow"],
        },
    },
    WidgetDatePicker: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetHtml: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        menu: {
            class: [],
        },
        editor: {
            class: [],
        },
    },
    WidgetInput: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetFile: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        file: {
            class: ["flex flex-wrap justify-between"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        link: {
            class: ["font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"],
        },
        buttonGroup: {
            class: ["flex gap-4"],
        },
    },
    WidgetImage: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        image: {
            class: ["flex flex-wrap justify-between"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetRadio: {
        root: { class: [] },
        inner: {
            class: ["flex"],
        },
        options: {
            class: ["flex gap-2 flex-wrap"],
        },
        option: {
            class: ["flex gap-1 flex-nowrap whitespace-nowrap items-center"],
        },
        optionInput: {
            class: [],
        },
        optionLabel: {
            class: ["text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetReadOnly: {
        root: { class: [] },
        inner: {
            class: ["flex"],
        },
        label: {
            class: ["ml-3", "text-surface-900/60 dark:text-white/60"],
        },
        input: {
            class: ["ml-3"],
        },
    },
    WidgetSelect: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetTextarea: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-3 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
};
