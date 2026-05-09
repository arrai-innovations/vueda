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
            class: ["bg-card border-b border-border px-5 py-[10px] flex items-center flex-wrap gap-2"],
        },
        primary: {
            class: ["flex flex-wrap gap-1.5 mr-auto"],
        },
        secondary: {
            class: ["flex flex-wrap gap-1.5 items-center"],
        },
        dirty: {
            class: [
                "inline-flex items-center justify-center",
                "h-[22px] px-2 rounded-full",
                "bg-primary/[0.12] text-primary",
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
            ],
        },
        gradient: {
            class: ["w-full h-3", "bg-gradient-to-b from-card to-transparent"],
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
