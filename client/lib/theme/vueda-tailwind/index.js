/**
 * @module theme/vueda-tailwind
 * @description Aggregated Tailwind CSS pass-through theme configuration for all VUEDA Client components.
 */
import controls from "@vueda/theme/vueda-tailwind/controls/index.js";
import display from "@vueda/theme/vueda-tailwind/display/index.js";
import feedback from "@vueda/theme/vueda-tailwind/feedback/index.js";
import form from "@vueda/theme/vueda-tailwind/form/index.js";
import grid from "@vueda/theme/vueda-tailwind/grid/index.js";
import navigation from "@vueda/theme/vueda-tailwind/navigation/index.js";
import objectsGrid from "@vueda/theme/vueda-tailwind/objects-grid/index.js";
import shell from "@vueda/theme/vueda-tailwind/shell/index.js";
import views from "@vueda/theme/vueda-tailwind/views/index.js";
import widgets from "@vueda/theme/vueda-tailwind/widgets/index.js";

export default {
    ...controls,
    ...grid,
    ...objectsGrid,
    ...form,
    ...navigation,
    ...shell,
    ...widgets,
    ...views,
    ...display,
    ...feedback,
    PaginationComponent: {
        root: {
            class: "flex flex-col sm:flex-row justify-between sm:justify-between items-center gap-2",
        },
        paginator: {
            class: ["py-2 flex-1 flex justify-center"],
        },
        pageReport: {
            class: ["text-sm tabular-nums"],
        },
        totalRecords: {
            class: ["p-2"],
        },
    },
    StickyBar: {
        root: ({ hidden }) => {
            return {
                class: {
                    "sticky top-[-1px] z-30": true,
                    "transition-transform duration-300 ease-in-out transform": true,
                    "translate-y-[-100%]": hidden,
                    "translate-y-0": !hidden,
                },
            };
        },
        inner: {
            //bg-zinc-100 dark:bg-zinc-800 pt-[2px]
            class: ["bg-white dark:bg-black", "pt-2"],
        },
        gradient: {
            class: [
                //w-full h-1 md:h-2 2xl:h-4 bg-gradient-to-b from-zinc-100 to-transparent dark:from-zinc-800 dark:to-transparent
                "w-full h-1 md:h-2 2xl:h-4",
                "bg-gradient-to-b from-white to-transparent dark:from-black dark:to-transparent",
            ],
        },
    },
    FilterGroup: {
        root: {
            class: "flex-col ",
        },
        filtersWrapper: {
            class: "flex flex-wrap gap-1 mt-1",
        },
        messageWrapper: {
            class: "flex my-2",
        },
    },
    FilterComponent: {
        root: {},
        clearButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-red-500 !text-red-500": errored,
            }),
        },
        dropdownButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-red-500 !text-red-500": errored,
            }),
        },
        formPopover: {
            class: ["sm:min-w-[25%]"],
        },
    },
    FilterForm: {
        outer: {
            class: ["flex flex-col"],
        },
        heading: {
            class: ["font-bold leading-relaxed"],
        },
    },
};
