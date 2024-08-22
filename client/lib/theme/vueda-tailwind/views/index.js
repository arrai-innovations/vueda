export default {
    PageTitle: {
        root: ({ props }) => ({
            class: [
                props.headerClass,
                {
                    "sticky top-0 z-30": props.sticky,
                },
            ],
        }),
        title: {
            class: "font-bold leading-relaxed text-3xl",
        },
        divider: {
            class: "w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2",
        },
        buttons: {
            class: "flex flex-col sm:flex-row gap-1 self-start w-full sm:w-auto",
        },
        subtitle: {
            class: "text-base leading-snug text-gray-500",
        },
        underActions: {
            class: "flex flex-wrap items-center gap-2",
        },
        footer: {
            class: "pt-4 border-t border-gray-200 dark:border-gray-700",
        },
        gradient: {
            class: "w-full h-2 md:h-3 lg:h-4 bg-gradient-to-b from-surface-0 to-transparent dark:from-surface-950 dark:to-transparent",
        },
    },
};
