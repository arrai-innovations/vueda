export default {
    WidgetAutoComplete: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col [&_input]:w-full"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetCheckbox: {
        root: {
            class: ["ml-2"],
        },
        inner: {
            class: ["flex"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetDatePicker: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2 flex-wrap [&_input]:w-full"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
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
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        innerItem: {
            class: ["flex flex-col flex-grow"],
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
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        link: {
            class: ["font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"],
        },
        buttonGroup: {
            class: ["flex gap-4"],
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
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
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
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        menu: {
            class: [],
        },
        editor: {
            class: [],
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
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetInput: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2 flex-wrap [&_input]:w-full"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        inputRoot: {},
    },
    WidgetMultiSelect: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
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
            class: ({ props }) => {
                return [
                    {
                        "text-surface-900/60 dark:text-white/60":
                            !props.validationState.invalid && !props.validationState.warning,
                        "text-red-500 dark:text-red-400": props.validationState.invalid,
                        "text-warning-500 dark:text-warning-400": props.validationState.warning,
                    },
                ];
            },
        },
    },
    WidgetReadOnly: {
        root: { class: [] },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-2", "text-surface-900/60 dark:text-white/60"],
        },
        input: {
            class: ["ml-2"],
        },
    },
    WidgetSearchableSelect: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2 [&_input]:w-full"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
        inputLabel: {
            class: ["whitespace-nowrap overflow-hidden text-ellipsis"],
        },
        option: {
            class: ["!whitespace-normal !h-auto"],
        },
    },
    WidgetSelect: {
        root: {
            class: [],
        },
        inner: {
            class: [["flex flex-col gap-2 flex-wrap [&_input]:w-full"]],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetSlider: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
    WidgetTextarea: {
        root: {
            class: [],
        },
        inner: {
            class: [["flex flex-col gap-2 flex-wrap [&_input]:w-full"]],
        },
        label: {
            class: ["ml-2 leading-7", "text-surface-900/60 dark:text-white/60"],
        },
    },
};
