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
            class: ["flex flex-col gap-2"],
        },
        inputRoot: {},
    },
    WidgetInputNumber: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2"],
        },
        input: {
            class: ({ invalid, warning }) => {
                return [
                    {
                        "w-full flex flex-grow": true,
                        "p-inputtext": true,
                        "p-invalid": invalid,
                        "p-warning": warning,
                    },
                ];
            },
        },
        formPopoverInner: { class: ["flex flex-col items-center"] },
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
            class: ({ invalid, warning }) => {
                return [
                    {
                        "text-surface-900/60 dark:text-white/60": !invalid && !warning,
                        "text-red-500 dark:text-red-400": invalid,
                        "text-warning-500 dark:text-warning-400": warning,
                    },
                ];
            },
        },
    },
    WidgetReadOnly: {
        root: { class: [] },
        inner: {
            class: ({ hidden }) => ({
                "flex flex-col": !hidden,
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
        linkItemPrefix: {
            class: [],
        },
        textItemPrefix: {
            class: [],
        },
        linkItemSuffix: {
            class: [],
        },
        textItemSuffix: {
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
        root: ({ isCardLayout, hidden, required, help, warning, invalid }) => {
            const isRequiredHasHelpOrHasValidation = required || help || warning || invalid;
            return {
                class: {
                    "ml-2 mb-1": !isCardLayout,
                    "gap-1": true,
                    // not items-baseline, checkboxes and buttons don't play well with it
                    // nor items-center, cells in the row stretch to fill the row by default
                    "grid grid-cols-[auto_1fr] justify-between": !hidden,
                    "flex flex-row items-baseline": hidden && isRequiredHasHelpOrHasValidation,
                },
            };
        },
        label: {
            class: ({ warning, invalid, hidden, required, help }) => {
                const showingButton = warning || invalid || help || required;
                return {
                    "sr-only": hidden,
                    "row-start-1 row-end-2 col-start-1": !hidden,
                    "col-end-2": !hidden && showingButton,
                    "col-end-3": !hidden && !showingButton,
                    "leading-[2.3958125rem]": true,
                    "text-surface-900/60 dark:text-white/60": true,
                    "!text-amber-600 dark:!text-amber-500": warning,
                    "!text-maroon-600 dark:!text-maroon-500": invalid,
                };
            },
        },
        feedback: ({ hidden }) => ({
            class: {
                "row-start-1 row-end-2 col-start-2 col-end-3": !hidden,
                "justify-self-end min-w-max": !hidden,
            },
        }),
        control: ({ hidden }) => {
            return {
                class: {
                    "row-start-2 row-end-3 col-start-1 col-end-3": !hidden,
                    grow: hidden,
                },
            };
        },
        required: {
            class: ["text-red-500 dark:text-red-400", "ml-1", "cursor-help"],
        },
    },
    WidgetPreviewableTemplate: {
        root: {
            class: [],
        },
        title: {
            class: ["text-surface-900 dark:text-white"],
        },
        inner: {
            class: ["grid lg:grid-cols-2 gap-2"],
        },
        editorWrapper: {
            class: ["flex flex-col gap-2"],
        },
        preview: {
            class: ["prose max-w-full flex flex-col row-start-2 row-end-3 col-start-1 col-end-3"],
        },
        label: {
            class: ["row-start-1 row-end-2 col-start-1 leading-[2.3958125rem] text-surface-900/60 dark:text-white/60"],
        },
        previewWrapper: {
            class: ["ml-2 mb-1 gap-1 grid grid-cols-[auto_1fr] justify-between"],
        },
    },
    WidgetTemplateLegend: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col gap-2"],
        },
        listItem: {
            class: ["flex flex-col sm:flex-row items-baseline px-2 sm:px-4"],
        },
    },
};
