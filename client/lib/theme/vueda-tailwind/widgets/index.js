/**
 * @module theme/vueda-tailwind/widgets
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client form widget components.
 */

export default {
    // ---------- Selection widgets ----------

    /**
     * Checkbox-backed widget wrapper for boolean fields. Adjusts the shared
     * label treatment so the toggle control and label align as one row.
     */
    WidgetCheckbox: {
        /** The outer row aligns the checkbox control with its label chrome. */
        root: {
            class: ["ml-2 flex flex-row grow items-baseline"],
        },
        /** The inner row lets the control and label share the available width. */
        inner: {
            class: ["flex flex-row grow items-baseline"],
        },
        /** The checkbox input keeps its intrinsic width instead of stretching. */
        input: {
            class: ["min-w-min grow-0 shrink-0"],
        },
        /** Local label overrides make {@api theme-key:WidgetLabel} read as a toggle row. */
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

    /**
     * Combobox widget trigger for searchable choice fields. Applies the
     * canonical control sizing, border, placeholder, disabled, and icon
     * treatments to the trigger button.
     */
    WidgetCombobox: {
        /** The trigger uses the input-shell recipe for searchable pickers; see DESIGN.md § 9.1 Selection / Command. */
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

    /**
     * Multi-part duration widget. Lays out the duration segments as wrapping
     * field columns with consistent spacing.
     */
    WidgetDuration: {
        /** The root intentionally carries no chrome so form layout owns spacing. */
        root: {
            class: [],
        },
        /** The inner row wraps duration segments when narrow columns run out of space. */
        inner: {
            class: ["flex flex-row gap-2 flex-wrap"],
        },
        /** Each duration segment stacks its label and control while sharing leftover width. */
        innerItem: {
            class: ["flex flex-col flex-grow"],
        },
    },

    // ---------- File and media widgets ----------

    /**
     * File widget for existing file links and file-related actions. Provides
     * the vertical wrapper, file row, truncated link, and action button group.
     */
    WidgetFile: {
        /** The root stays transparent so the field shell provides the surface. */
        root: {
            class: [],
        },
        /** The inner column stacks the current file row with any file controls. */
        inner: {
            class: ["flex flex-col"],
        },
        /** The file row wraps metadata and actions without forcing horizontal overflow. */
        file: {
            class: ["flex flex-wrap justify-between"],
        },
        /** The file link is emphasized and truncated to keep long filenames inside the row. */
        link: {
            class: ["font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"],
        },
        /** The action group spaces file commands as separate controls. */
        buttonGroup: {
            class: ["flex gap-4"],
        },
    },

    // ---------- Autocomplete widgets ----------

    /**
     * Generic autocomplete widget with separate dropdown and autocomplete
     * controls. Keeps both control columns aligned while allowing the text
     * input area to grow.
     */
    WidgetGenericAutoComplete: {
        /** The root remains unstyled so the widget can sit inside any form shell. */
        root: {
            class: [],
        },
        /** The inner row wraps the dropdown and text lookup controls together. */
        inner: {
            class: ["flex flex-row gap-2 flex-wrap"],
        },
        /** The dropdown column keeps only the width its trigger needs. */
        dropdownOuter: {
            class: ["flex flex-col flex-shrink"],
        },
        /** The autocomplete column grows to absorb remaining row width. */
        autoCompleteOuter: {
            class: ["flex flex-col flex-grow"],
        },
    },

    // ---------- Rich content widgets ----------

    /**
     * HTML editing widget chrome. Styles the bordered editor frame, toolbar,
     * toolbar buttons, active state, and separators around the editing area.
     */
    WidgetHtml: {
        /** The root adds no spacing so form composition controls the editor block. */
        root: {
            class: [],
        },
        /** The inner frame supplies the bordered control surface and clips editor content. */
        inner: {
            class: ["flex flex-col border border-input rounded-vueda-control overflow-hidden"],
        },
        /** The toolbar is a muted, wrapping command strip above the editing area. */
        toolbar: {
            class: ["flex flex-row flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-1.5 py-1"],
        },
        /** Toolbar buttons use compact slab control styling; see DESIGN.md § 4.2. */
        toolbarButton: {
            class: [
                "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-sm font-medium text-muted-foreground",
                "hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** The active toolbar button uses the same accent surface as selected menu actions; see DESIGN.md § 2.2. */
        toolbarButtonActive: {
            class: ["bg-accent text-accent-foreground"],
        },
        /** Separators divide toolbar command groups with a muted vertical rule. */
        toolbarSeparator: {
            class: ["mx-0.5 h-5 w-px bg-border"],
        },
    },

    /**
     * Image widget for displaying and managing image-backed fields. Provides
     * the vertical wrapper and flexible image action row.
     */
    WidgetImage: {
        /** The root is transparent so image widgets inherit the surrounding field rhythm. */
        root: {
            class: [],
        },
        /** The inner column stacks image preview and image actions. */
        inner: {
            class: ["flex flex-col"],
        },
        /** The image row wraps preview details and actions without overflow. */
        image: {
            class: ["flex flex-wrap justify-between"],
        },
    },

    // ---------- Read-only and labels ----------

    /**
     * Read-only widget used to render values without editing controls. Handles
     * hidden state, value text, and optional prefix or suffix fragments for
     * linked and plain text items.
     */
    WidgetReadOnly: {
        /** The root has no chrome because read-mode rows are owned by the field shell. */
        root: { class: [] },
        /** The inner wrapper collapses when hidden and stacks visible read-only content. */
        inner: {
            class: ({ hidden }) => ({
                "flex flex-col": !hidden,
            }),
        },
        /** The input slot indents read-only control fragments to align with editable widgets. */
        input: {
            class: ["ml-2"],
        },
        /** The value text uses the read-mode record recipe; see DESIGN.md § 9.1 Forms. */
        value: {
            class: ["text-[13px]/[1.5] text-foreground"],
        },
        /** A linked value item carries link content without adding extra chrome. */
        linkItem: {
            class: [],
        },
        /** A plain value item mirrors {@api theme-key:WidgetReadOnly.linkItem} without link behavior. */
        textItem: {
            class: [],
        },
        /** Prefix content before linked values stays visually neutral. */
        linkItemPrefix: {
            class: [],
        },
        /** Prefix content before plain values follows {@api theme-key:WidgetReadOnly.linkItemPrefix}. */
        textItemPrefix: {
            class: [],
        },
        /** Suffix content after linked values stays visually neutral. */
        linkItemSuffix: {
            class: [],
        },
        /** Suffix content after plain values follows {@api theme-key:WidgetReadOnly.linkItemSuffix}. */
        textItemSuffix: {
            class: [],
        },
    },

    /**
     * Shared widget label wrapper. Coordinates visible, hidden, required, help,
     * warning, invalid, feedback, and control regions around the active widget.
     */
    WidgetLabel: {
        /** The root grid pairs label text with feedback actions above the control. */
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
        /** The label moves between visible grid text and screen-reader-only text when hidden. */
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
        /** The feedback slot sits at the row end for help, required, warning, and invalid affordances. */
        feedback: ({ hidden }) => ({
            class: {
                "row-start-1 row-end-2 col-start-2 col-end-3": !hidden,
                "justify-self-end min-w-max": !hidden,
            },
        }),
        /** The control slot spans the full second row unless the label is hidden. */
        control: ({ hidden }) => {
            return {
                class: {
                    "row-start-2 row-end-3 col-start-1 col-end-3": !hidden,
                    grow: hidden,
                },
            };
        },
        /** The required marker uses destructive status color; see DESIGN.md § 9.1 Forms. */
        required: {
            class: ["text-red-500 dark:text-red-400", "ml-1", "cursor-help"],
        },
    },

    // ---------- Template widgets ----------

    /**
     * Template editor with a live preview pane. Arranges the editor, preview,
     * title, and label regions for message or document templates.
     */
    WidgetPreviewableTemplate: {
        /** The root adds no chrome so the surrounding form section owns spacing. */
        root: {
            class: [],
        },
        /** The title uses foreground text for the previewable template heading. */
        title: {
            class: ["text-neutral-900 dark:text-white"],
        },
        /** The inner grid places editor and preview side by side on wide screens. */
        inner: {
            class: ["grid lg:grid-cols-2 gap-2"],
        },
        /** The editor wrapper stacks editing controls with a small gap. */
        editorWrapper: {
            class: ["flex flex-col gap-2"],
        },
        /** The preview pane uses prose defaults while spanning below the label row. */
        preview: {
            class: ["prose max-w-full flex flex-col row-start-2 row-end-3 col-start-1 col-end-3"],
        },
        /** The preview label matches widget label color and line height for alignment. */
        label: {
            class: ["row-start-1 row-end-2 col-start-1 leading-[2.3958125rem] text-neutral-900/60 dark:text-white/60"],
        },
        /** The preview wrapper mirrors {@api theme-key:WidgetLabel.root} for label and preview alignment. */
        previewWrapper: {
            class: ["ml-2 mb-1 gap-1 grid grid-cols-[auto_1fr] justify-between"],
        },
    },

    /**
     * Legend for template placeholders or merge tags. Displays helper entries
     * in a compact vertical list that can widen at larger breakpoints.
     */
    WidgetTemplateLegend: {
        /** The root stays unstyled so the legend can be embedded beside any template widget. */
        root: {
            class: [],
        },
        /** The inner column spaces placeholder entries evenly. */
        inner: {
            class: ["flex flex-col gap-2"],
        },
        /** Each legend item stacks on small screens and becomes a baseline row on wider screens. */
        listItem: {
            class: ["flex flex-col sm:flex-row items-baseline px-2 sm:px-4"],
        },
    },
};
