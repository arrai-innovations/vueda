import storeTheme from "@vueda/stores/storeTheme.js";

const defaultComponents = {
    "@vueda/views/ViewList.vue": {
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
    "@vueda/views/ViewCreate.vue": {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    "@vueda/views/ViewUpdate.vue": {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    "@vueda/views/ViewRead.vue": {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    "@vueda/views/ViewDelete.vue": {
        defaultVariant: "default",
        spots: ["outer", "header", "title", "loading"],
    },
    "@vueda/components/ObjectsGrid.vue": {
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
    "@vueda/components/FormLabel.vue": {
        defaultVariant: "default",
        spots: ["label"],
    },
    "@vueda/components/FormModel.vue": {
        defaultVariant: "default",
        spots: ["label"],
    },
    "@vueda/widgets/WidgetInput.vue": {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    "@vueda/widgets/WidgetCheckbox.vue": {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    "@vueda/widgets/WidgetSelect.vue": {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    "@vueda/widgets/WidgetTextarea.vue": {
        defaultVariant: "default",
        spots: ["outer", "prefix", "input", "suffix"],
    },
    "@vueda/components/FormHelpText.vue": {
        defaultVariant: "default",
        spots: ["help"],
    },
    "@vueda/components/FormFeedback.vue": {
        defaultVariant: "default",
        spots: ["errors", "error", "messages", "message"],
    },
};

const defaultVariants = {
    "@vueda/views/ViewList.vue": {
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
    "@vueda/components/ObjectsGrid.vue": {
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

export default function () {
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
