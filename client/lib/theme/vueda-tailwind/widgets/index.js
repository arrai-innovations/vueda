export default {
    WidgetAutoComplete: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
    },
    WidgetCheckbox: {
        root: {
            class: ["ml-2 flex flex-row grow"],
        },
        inner: {
            class: ["flex flex-row grow items-center"],
        },
        input: {
            class: ["min-w-min grow-0 shrink-0"],
        },
        labelRoot: {
            class: {
                grow: true,
                "mb-1": false,
            },
        },
        labelLabel: {
            class: {
                "leading-7": false,
            },
        },
    },
    WidgetDatePicker: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2 flex-wrap"],
        },
    },
    WidgetDuration: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-row gap-2 flex-wrap"],
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
            class: ["flex flex-row gap-2 flex-wrap"],
        },
        dropdownOuter: {
            class: ["flex flex-col flex-shrink"],
        },
        autoCompleteOuter: {
            class: ["flex flex-col flex-grow"],
        },
    },
    WidgetHtml: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
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
    },
    WidgetInput: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2 flex-wrap"],
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
        input: {
            class: ["ml-2"],
        },
    },
    WidgetSearchableSelect: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2"],
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
            class: [["flex flex-col gap-2 flex-wrap"]],
        },
    },
    WidgetSlider: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
    },
    WidgetTextarea: {
        root: {
            class: [],
        },
        inner: {
            class: [["flex flex-col gap-2 flex-wrap"]],
        },
    },
    WidgetLabel: {
        root: {
            class: [
                "ml-2 mb-1",
                "flex flex-row items-center justify-between",
                // not items-baseline, checkboxes and buttons don't play well with it
            ],
        },
        label: {
            class: ({ validationState }) => ({
                "leading-7": true,
                "text-surface-900/60 dark:text-white/60": true,
                "!text-amber-600 dark:!text-amber-500": validationState.warning,
                "!text-maroon-600 dark:!text-maroon-500": validationState.invalid,
            }),
        },
    },
};
