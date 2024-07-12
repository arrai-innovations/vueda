import { storeTheme } from "@vueda/stores/storeTheme.js";

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
