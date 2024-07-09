import { storeTheme } from "@vueda/stores/storeTheme.js";

const defaultComponents = {
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
    ViewCreate: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    ViewUpdate: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    ViewRead: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    ViewDelete: {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
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
    FormLabel: {
        defaultVariant: "default",
        spots: ["label"],
    },
    FormModel: {
        defaultVariant: "default",
        spots: ["label"],
    },
    PaginationComponent: {
        defaultVariant: "default",
        spots: ["outer"],
    },
    WidgetInput: {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    WidgetReadonly: {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    WidgetCheckbox: {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    WidgetSelect: {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    WidgetTextarea: {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    FormHelpText: {
        defaultVariant: "default",
        spots: ["help"],
    },
    FormFeedback: {
        defaultVariant: "default",
        spots: ["errors", "error", "messages", "message"],
    },
};

const defaultVariants = {
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
