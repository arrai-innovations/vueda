export default {
    DateTimeDisplay: {
        root: {
            class: "flex items-center space-x-2",
        },
        inline: {
            class: "whitespace-nowrap",
        },
        break: {
            absolute: "whitespace-nowrap",
            relative: "whitespace-nowrap mt-1",
        },
        absolute: {
            class: "whitespace-nowrap",
        },
        relative: {
            class: "whitespace-nowrap",
        },
        tooltip: {
            class: "cursor-help",
        },
        dash: {
            class: "text-surface-500",
        },
    },
    ErrorDisplay: {
        root: {
            class: "w-full",
        },
        container: {
            class: "max-w-full overflow-x-auto p-1 flex flex-col gap-2",
        },
        message: {
            class: [],
        },
        codeBlock: {
            class: "bg-surface-100 dark:bg-surface-800 p-2 rounded", // Styling for the code block
        },
        link: {
            class: "underline",
        },
    },
};
