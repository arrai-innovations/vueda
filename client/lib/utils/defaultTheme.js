import { storeTheme } from "@vueda/stores/storeTheme.js";

const label = "text-surface-900/60 dark:text-white/60";
const textEmphasis = "text-material-black dark:text-white font-semibold not-italic";
const textRegular = "text-neutral-800 dark:text-neutral-200 font-normal not-italic";

const defaultComponents = {
    FilterFormModel: {
        defaultVariant: "default",
        spots: ["label"],
    },
    FormFeedback: {
        defaultVariant: "default",
        spots: ["errors", "error", "messages", "message"],
    },
    FormHelpText: {
        defaultVariant: "default",
        spots: ["help"],
    },
    FormModel: {
        defaultVariant: "default",
        spots: ["outer", "beforeFields", "afterFields", "fields", "field"],
    },
    ObjectsGrid: {
        defaultVariant: "default",
        spots: [
            "oddTwoColumnCard",
            "evenTwoColumnCard",
            "oddCardOrRow",
            "outer",
            "headerGroup",
            "row",
            "header",
            "sort",
            "sortNum",
            "rowGroup",
            "rowGroupCards",
            "emptyText",
            "card",
            "cell",
            "cardHeader",
            "cardCell",
        ],
    },
    PaginationComponent: {
        defaultVariant: "default",
        spots: ["outer"],
    },
    ViewCreate: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    ViewDelete: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    ViewList: {
        defaultVariant: "default",
        spots: [
            "outer",
            "header",
            "title",
            "loading",
            "listActions",
            "listAction",
            "detailActionsClass",
            "detailActionClass",
        ],
    },
    ViewRead: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    ViewUpdate: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    WidgetCheckbox: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner"],
    },
    WidgetDatePicker: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner"],
    },
    WidgetHtml: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner"],
    },
    WidgetInput: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner"],
    },
    WidgetRadio: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner", "options", "option", "optionLabel"],
    },
    WidgetReadonly: {
        defaultVariant: "default",
        spots: ["outer", "inner", "label", "input"],
    },
    WidgetSelect: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner"],
    },
    WidgetTextarea: {
        defaultVariant: "default",
        spots: ["outer", "label", "inner"],
    },
};

const defaultVariants = {
    FormModel: {
        default: {
            outer: "px-8 pt-6 pb-8 mb-4",
            beforeFields: "mb-4",
            afterFields: "mt-4",
            fields: "space-y-4",
            field: "mb-2",
        },
    },
    ObjectsGrid: {
        default: {
            outer: ["mb-2", "md:mb-4", "lg:mb-7"],
            headerGroup: ["hidden"],
            rowGroup: ["gap-4"],
            rowGroupCards: [
                "grid",
                "gap-4",
                "grid-cols-1",
                "sm:grid-cols-2",
                "md:grid-cols-3",
                "lg:grid-cols-4",
                "xl:grid-cols-5",
                "grid-flow-row",
            ],
            row: [],
            header: ["align-middle", textEmphasis, "font-medium", "px-1", "md:px-2", "lg:px-4", "select-none"],
            cell: ["align-middle", "border-neutral-200", "dark:border-neutral-700", textRegular],
            cardHeader: [textEmphasis],
            cardCell: [textRegular],
            card: ["sm:!flex flex-col gap-2 p-2", "2xs:grid", "2xs:gap-4", "2xs:grid-cols-2", "2xs:grid-flow-row"],
            oddTwoColumnCard: ["bg-neutral-200", "dark:bg-neutral-800"],
            evenTwoColumnCard: ["bg-neutral-100", "dark:bg-neutral-900"],
            oddCardOrRow: ["bg-neutral-100", "dark:bg-neutral-900", "odd:bg-neutral-200", "dark:odd:bg-neutral-800"],
            sort: ["bg-neutral-600", "text-white", "dark:bg-neutral-300", "dark:text-material-black", "rounded-sm"],
            sortNum: ["pr-1"],
            emptyText: ["text-center"],
        },
        sm: {
            outer: ["sm:table"],
            headerGroup: ["sm:table-header-group"],
            rowGroup: ["sm:!table-row-group"],
            row: ["sm:table-row"],
            card: ["sm:!table-row", "sm:p-0"],
            header: ["sm:table-cell", "sm:h-[3.5rem]", "sm:py-1"],
            cell: ["sm:table-cell", "sm:h-[3.5rem]"],
        },
        md: {
            outer: ["md:table"],
            headerGroup: ["md:table-header-group"],
            rowGroup: ["md:!table-row-group"],
            row: ["md:table-row"],
            card: ["md:!table-row", "md:p-0"],
            header: ["md:table-cell", "md:h-[3.5rem]", "md:py-1"],
            cell: ["md:table-cell", "md:h-[3.5rem]"],
        },
        lg: {
            outer: ["lg:table"],
            headerGroup: ["lg:table-header-group"],
            rowGroup: ["lg:!table-row-group"],
            row: ["lg:table-row"],
            card: ["lg:!table-row", "lg:p-0"],
            header: ["lg:table-cell", "lg:h-[3.5rem]", "lg:py-1"],
            cell: ["lg:table-cell", "lg:h-[3.5rem]"],
        },
        xl: {
            outer: ["xl:table"],
            headerGroup: ["xl:table-header-group"],
            rowGroup: ["xl:!table-row-group"],
            row: ["xl:table-row"],
            card: ["xl:!table-row", "xl:p-0"],
            header: ["xl:table-cell", "xl:h-[3.5rem]", "xl:py-1"],
            cell: ["xl:table-cell", "xl:h-[3.5rem]"],
        },
    },
    ViewList: {
        default: {
            outer: "outer",
            header: "header",
            title: "title",
            loading: "loading",
            listActions: "listActions",
            listAction: "listAction",
            detailActionsClass: "detailActionsClass",
            detailActionClass: "detailActionClass",
        },
    },
    WidgetCheckbox: {
        default: {
            outer: "",
            label: "ml-2 leading-7 " + label,
            inner: "flex",
        },
    },
    WidgetDatePicker: {
        default: {
            outer: "",
            label: label,
            inner: "",
        },
    },
    WidgetHtml: {
        default: {
            outer: "",
            label: label,
            inner: "",
        },
    },
    WidgetInput: {
        default: {
            outer: "",
            label: label,
            inner: "",
        },
    },
    WidgetRadio: {
        default: {
            outer: "",
            label: label,
            inner: "flex",
            options: "flex",
            option: "flex",
            optionLabel: "ml-2",
        },
    },
    WidgetReadonly: {
        default: {
            outer: "",
            inner: "flex",
            label: label,
            input: "bg-gray-200",
        },
    },
    WidgetSelect: {
        default: {
            outer: "",
            label: label,
            inner: "",
        },
    },
    WidgetTextarea: {
        default: {
            outer: "",
            label: label,
            inner: "",
        },
    },
};

export function defaultTheme() {
    const themeStore = storeTheme();

    for (const componentName of Object.keys(defaultComponents)) {
        themeStore.registerComponent(componentName, defaultComponents[componentName]);
    }

    for (const componentName of Object.keys(defaultVariants)) {
        for (const variantName of Object.keys(defaultVariants[componentName])) {
            themeStore.registerVariant(componentName, variantName, defaultVariants[componentName][variantName]);
        }
    }
}
