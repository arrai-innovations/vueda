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
            class: ["ml-2 flex flex-row grow items-baseline"],
        },
        inner: {
            class: ["flex flex-row grow items-baseline"],
        },
        input: {
            class: ["min-w-min grow-0 shrink-0"],
        },
        themeOverride: {
            WidgetLabel: {
                root: {
                    class: {
                        grid: false,
                        // items-baseline doesn't play nice with the toggle switch
                        "flex gap-2 items-center": true,
                        "ml-2 mb-1": false,
                    },
                },
                label: {
                    class: {
                        "leading-7": false,
                    },
                },
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
            class: ["flex flex-col gap-2 flex-wrap [&>*]:flex-1 [&>*]:!w-full"],
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
            class: ({ props }) => ({
                "flex flex-col": !props.hidden,
            }),
        },
        input: {
            class: ["ml-2"],
        },
        value: {
            class: [],
        },
        linkItem: {
            class: [],
        },
        textItem: {
            class: [],
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
        root: ({ props, widgetContextState }) => {
            const isRequiredHasHelpOrHasValidation =
                widgetContextState?.required ||
                props.help ||
                widgetContextState?.validationState?.warning ||
                widgetContextState?.validationState?.invalid;
            return {
                class: {
                    "ml-2 mb-1": !props.isCardLayout,
                    "gap-1": true,
                    // "flex flex-row items-stretch gap-1",
                    // not items-baseline, checkboxes and buttons don't play well with it
                    "grid grid-cols-[max-content_auto] justify-between items-center": !props.hidden,
                    "flex flex-row-reverse items-baseline": props.hidden && isRequiredHasHelpOrHasValidation,
                },
            };
        },
        label: {
            class: ({ widgetContextState, props }) => {
                const hasValidation =
                    widgetContextState?.validationState?.warning || widgetContextState?.validationState?.invalid;
                return {
                    "sr-only": props.hidden,
                    "row-start-1 row-end-2 col-start-1": !props.hidden,
                    "col-end-2": !props.hidden && hasValidation,
                    "col-end-3": !props.hidden && !hasValidation,
                    "leading-7": true,
                    "text-surface-900/60 dark:text-white/60": true,
                    "!text-amber-600 dark:!text-amber-500": widgetContextState?.validationState?.warning,
                    "!text-maroon-600 dark:!text-maroon-500": widgetContextState?.validationState?.invalid,
                };
            },
        },
        feedback: ({ props }) => ({
            class: {
                "row-start-1 row-end-2 col-start-2 col-end-3": !props.hidden,
                "justify-self-end min-w-max": !props.hidden,
            },
        }),
        control: ({ props }) => {
            return {
                class: {
                    "row-start-2 row-end-3 col-start-1 col-end-3": !props.hidden,
                    grow: props.hidden,
                },
            };
        },
    },
};
