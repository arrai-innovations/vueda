import { storeTheme } from "@vueda/stores/storeTheme.js";

const label = "text-surface-900/60 dark:text-white/60";

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
            "tableHeaderGroup",
            "tableRow",
            "tableHeader",
            "tableRowGroup",
            "card",
            "tableCell",
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
            oddTwoColumnCard: "oddTwoColumnCard",
            evenTwoColumnCard: "evenTwoColumnCard",
            oddCardOrRow: "oddCardOrRow",
            outer: "outer",
            tableHeaderGroup: "tableHeaderGroup",
            tableRow: "tableRow",
            tableHeader: "tableHeader",
            tableRowGroup: "tableRowGroup",
            card: "card",
            tableCell: "tableCell",
            cardHeader: "cardHeader",
            cardCell: "cardCell",
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
