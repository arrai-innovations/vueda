/**
 * @module theme/vueda-tailwind/widgets
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client form widget components.
 */

export default {
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
    WidgetCombobox: {
        trigger: {
            class: [
                "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
                "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
                "dark:bg-input/30 dark:hover:bg-input/50",
                "flex w-full h-vueda-control items-center justify-between gap-2 rounded-vueda-control border bg-transparent px-vueda-control-px text-sm",
                "whitespace-nowrap shadow-vueda-control transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
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
            class: ["flex flex-col border border-input rounded-vueda-control overflow-hidden"],
        },
        toolbar: {
            class: ["flex flex-row flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-1.5 py-1"],
        },
        toolbarButton: {
            class: [
                "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-sm font-medium text-muted-foreground",
                "hover:bg-accent hover:text-accent-foreground",
            ],
        },
        toolbarButtonActive: {
            class: ["bg-accent text-accent-foreground"],
        },
        toolbarSeparator: {
            class: ["mx-0.5 h-5 w-px bg-border"],
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
                    "text-neutral-900/60 dark:text-white/60": true,
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
            class: ["text-neutral-900 dark:text-white"],
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
            class: ["row-start-1 row-end-2 col-start-1 leading-[2.3958125rem] text-neutral-900/60 dark:text-white/60"],
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
