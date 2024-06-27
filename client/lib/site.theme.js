import { reactive, ref } from "vue";

const refIfDev = (obj) => {
    // only use vueRef in dev mode, themes won't change at runtime in prod
    if (import.meta.env.DEV) {
        return ref(obj);
    }
    return obj;
};
const reactiveIfDev = (obj) => {
    // only use vueReactive in dev mode, themes won't change at runtime in prod
    if (import.meta.env.DEV) {
        return reactive(obj);
    }
    return obj;
};

export const errorText = refIfDev("text-yellow-800 dark:text-yellow-700 font-medium");

export const areaClasses = reactiveIfDev({
    nav: {
        background: ["bg-neutral-200", "dark:bg-neutral-800"],
        border: ["border-red-700", "dark:border-red-400"],
        text: ["text-neutral-900", "dark:text-neutral-50"],
        logoLink: [
            // this height is related to the height of the breadcrumbs and the padding top of the main
            //  we want the logo and breadcrumbs align
            "lg:h-[3.5rem]",
        ],
    },
    breadcrumb: {
        background: [],
        text: [],
    },
    login: {
        background: ["bg-neutral-100", "dark:bg-neutral-900"],
        border: ["border-neutral-200", "dark:border-neutral-700", "border-2"],
    },
    overlay: {
        background: [],
    },
    content: {
        // match to index.html <body>
        background: ["bg-neutral-100", "dark:bg-neutral-900"],
    },
    pageTitle: {
        background: ["bg-neutral-100", "dark:bg-neutral-900"],
    },
    textColor: {
        emphasis: ["text-material-black", "dark:text-white", "font-semibold", "not-italic"],
        regular: ["text-neutral-800", "dark:text-neutral-200", "font-normal", "not-italic"],
        muted: ["text-neutral-600", "dark:text-neutral-400", "italic", "font-normal"],
    },
    // todo: keep only the used ones
    site: {
        paddingXs: ["p-0.5", "md:p-1", "lg:p-2"],
        paddingXsX: ["px-0.5", "md:px-1", "lg:px-2"],
        paddingXsY: ["py-0.5", "md:py-1", "lg:py-2"],
        paddingXsL: ["pl-0.5", "md:pl-1", "lg:pl-2"],
        paddingXsR: ["pr-0.5", "md:pr-1", "lg:pr-2"],
        paddingXsT: ["pt-0.5", "md:pt-1", "lg:pt-2"],
        paddingXsB: ["pb-0.5", "md:pb-1", "lg:pb-2"],
        paddingSm: ["p-1", "md:p-2", "lg:p-4"],
        paddingSmX: ["px-1", "md:px-2", "lg:px-4"],
        paddingSmY: ["py-1", "md:py-2", "lg:py-4"],
        paddingSmL: ["pl-1", "md:pl-2", "lg:pl-4"],
        paddingSmR: ["pr-1", "md:pr-2", "lg:pr-4"],
        paddingSmT: ["pt-1", "md:pt-2", "lg:pt-4"],
        paddingSmB: ["pb-1", "md:pb-2", "lg:pb-4"],
        padding: ["p-2", "md:p-4", "lg:p-7"],
        paddingX: ["px-2", "md:px-4", "lg:px-7"],
        paddingY: ["py-2", "md:py-4", "lg:py-7"],
        paddingL: ["pl-2", "md:pl-4", "lg:pl-7"],
        paddingR: ["pr-2", "md:pr-4", "lg:pr-7"],
        paddingT: ["pt-2", "md:pt-4", "lg:pt-7"],
        paddingB: ["pb-2", "md:pb-4", "lg:pb-7"],
        paddingLg: ["p-4", "md:p-7", "lg:p-11"],
        paddingLgX: ["px-4", "md:px-7", "lg:px-11"],
        paddingLgY: ["py-4", "md:py-7", "lg:py-11"],
        paddingLgL: ["pl-4", "md:pl-7", "lg:pl-11"],
        paddingLgR: ["pr-4", "md:pr-7", "lg:pr-11"],
        paddingLgT: ["pt-4", "md:pt-7", "lg:pt-11"],
        paddingLgB: ["pb-4", "md:pb-7", "lg:pb-11"],
        marginXs: ["m-0.5", "md:m-1", "lg:m-2"],
        marginXsX: ["mx-0.5", "md:mx-1", "lg:mx-2"],
        marginXsY: ["my-0.5", "md:my-1", "lg:my-2"],
        marginXsL: ["ml-0.5", "md:ml-1", "lg:ml-2"],
        marginXsR: ["mr-0.5", "md:mr-1", "lg:mr-2"],
        marginXsT: ["mt-0.5", "md:mt-1", "lg:mt-2"],
        marginXsB: ["mb-0.5", "md:mb-1", "lg:mb-2"],
        marginSm: ["m-1", "md:m-2", "lg:m-4"],
        marginSmX: ["mx-1", "md:mx-2", "lg:mx-4"],
        marginSmY: ["my-1", "md:my-2", "lg:my-4"],
        marginSmL: ["ml-1", "md:ml-2", "lg:ml-4"],
        marginSmR: ["mr-1", "md:mr-2", "lg:mr-4"],
        marginSmT: ["mt-1", "md:mt-2", "lg:mt-4"],
        marginSmB: ["mb-1", "md:mb-2", "lg:mb-4"],
        margin: ["m-2", "md:m-4", "lg:m-7"],
        marginX: ["mx-2", "md:mx-4", "lg:mx-7"],
        marginY: ["my-2", "md:my-4", "lg:my-7"],
        marginL: ["ml-2", "md:ml-4", "lg:ml-7"],
        marginR: ["mr-2", "md:mr-4", "lg:mr-7"],
        marginT: ["mt-2", "md:mt-4", "lg:mt-7"],
        marginB: ["mb-2", "md:mb-4", "lg:mb-7"],
        marginLg: ["m-4", "md:m-7", "lg:m-11"],
        marginLgX: ["mx-4", "md:mx-7", "lg:mx-11"],
        marginLgY: ["my-4", "md:my-7", "lg:my-11"],
        marginLgL: ["ml-4", "md:ml-7", "lg:ml-11"],
        marginLgR: ["mr-4", "md:mr-7", "lg:mr-11"],
        marginLgT: ["mt-4", "md:mt-7", "lg:mt-11"],
        marginLgB: ["mb-4", "md:mb-7", "lg:mb-11"],
        gapSm: ["gap-0.5", "md:gap-1", "lg:gap-2"],
        gap: ["gap-1", "md:gap-2", "lg:gap-4"],
        gapLg: ["gap-2", "md:gap-4", "lg:gap-7"],
        gapSmX: ["gap-x-0.5", "md:gap-x-1", "lg:gap-x-2"],
        gapX: ["gap-x-1", "md:gap-x-2", "lg:gap-x-4"],
        gapLgX: ["gap-x-2", "md:gap-x-4", "lg:gap-x-7"],
        gapSmY: ["gap-y-0.5", "md:gap-y-1", "lg:gap-y-2"],
        gapY: ["gap-y-1", "md:gap-y-2", "lg:gap-y-4"],
        gapLgY: ["gap-y-2", "md:gap-y-4", "lg:gap-y-7"],
    },
    fieldGroup: {
        border: ["border-neutral-700", "dark:border-neutral-200"],
    },
});

export const listClasses = reactiveIfDev({
    disabled: ["opacity-70"],
});

export const tableClasses = reactiveIfDev({
    cardHeader: [areaClasses.textColor.emphasis],
    cardCell: [areaClasses.textColor.regular],
    card: [
        //"border-2", "border-neutral-200", "dark:border-neutral-700", "md:border-0"
    ],
    oddCardOrRow: ["bg-neutral-100", "dark:bg-neutral-900", "odd:bg-neutral-200", "dark:odd:bg-neutral-800"],
    oddTwoColumnCard: ["bg-neutral-200", "dark:bg-neutral-800"],
    evenTwoColumnCard: ["bg-neutral-100", "dark:bg-neutral-900"],
    tableHeader: ["align-middle", areaClasses.textColor.emphasis, "font-medium"],
    tableCell: ["align-middle", "border-neutral-200", "dark:border-neutral-700", areaClasses.textColor.regular],
    // horrific
    tableBreakpoint: {
        sm: {
            table: ["sm:table"],
            tableHeaderGroup: ["sm:table-header-group"],
            tableRowGroup: ["sm:!table-row-group"],
            tableRow: ["sm:table-row"],
            tableContentRow: ["sm:!table-row", "sm:p-0"],
            tableHeader: ["sm:table-cell", "sm:h-[3.5rem]", "sm:py-1"],
            tableCell: ["sm:table-cell", "sm:h-[3.5rem]"],
        },
        md: {
            table: ["md:table"],
            tableHeaderGroup: ["md:table-header-group"],
            tableRowGroup: ["md:!table-row-group"],
            tableRow: ["md:table-row"],
            tableContentRow: ["md:!table-row", "md:p-0"],
            tableHeader: ["md:table-cell", "md:h-[3.5rem]", "md:py-1"],
            tableCell: ["md:table-cell", "md:h-[3.5rem]"],
        },
        lg: {
            table: ["lg:table"],
            tableHeaderGroup: ["lg:table-header-group"],
            tableRowGroup: ["lg:!table-row-group"],
            tableRow: ["lg:table-row"],
            tableContentRow: ["lg:!table-row", "lg:p-0"],
            tableHeader: ["lg:table-cell", "lg:h-[3.5rem]", "lg:py-1"],
            tableCell: ["lg:table-cell", "lg:h-[3.5rem]"],
        },
        xl: {
            table: ["xl:table"],
            tableHeaderGroup: ["xl:table-header-group"],
            tableRowGroup: ["xl:!table-row-group"],
            tableRow: ["xl:table-row"],
            tableContentRow: ["xl:!table-row", "xl:p-0"],
            tableHeader: ["xl:table-cell", "xl:h-[3.5rem]", "xl:py-1"],
            tableCell: ["xl:table-cell", "xl:h-[3.5rem]"],
        },
    },
});

export const toastClasses = reactiveIfDev({
    outer: [
        "toast-outer",
        "print:hidden",
        "flex",
        "flex-col-reverse",
        "sticky",
        "bottom-0",
        "z-50",
        "max-h-0",
        areaClasses.site.paddingSmB,
    ],
    wrapper: ["toast-wrapper", "flex", "flex-col-reverse", areaClasses.site.gapLg],
    inner: [
        // the duplicate dark: gradient* specifications fixes a known issue, due to some known safari bug that tailwind is working around.
        "toast-inner",
        "flex",
        "bg-neutral-200",
        "dark:bg-neutral-700",
        "bg-gradient-to-r",
        "from-[2px]",
        "to-[4.5rem]",
        "to-transparent",
        "shadow-[inset_0_1px_0]",
        "shadow-white/25",
        "drop-shadow",
    ],
    content: [
        "toast-content",
        "grow",
        "flex",
        // hack: items-baseline does not work here as expected in firefox,
        //  it aligns the left text to the bottom of the right button instead of the text of the button.
        //  the additional padding on time, message and prefix fixes this.
        //  suffix is the container for the button, if it had replaced content, it would be misaligned.
        // "items-baseline",
        "items-start",
        areaClasses.site.gap,
        areaClasses.site.paddingSmX,
        areaClasses.site.paddingXsY,
    ],
    time: ["text-right", "pt-[0.438rem]"],
    message: ["flex-1", "font-medium", "pt-[0.438rem]"],
    prefix: ["shrink-0", areaClasses.site.paddingXsL, "pt-[0.438rem]"],
    suffix: ["shrink-0"],
    progress: ["h-full", "w-1", "bg-material-black", "dark:bg-white"],
    fill: ["w-full", "bg-neutral-400", "dark:bg-neutral-500"],
});

export const toastVariantClasses = reactiveIfDev({
    error: {
        inner: ["from-yellow-600"],
    },
    info: {
        inner: ["from-blue-600"],
    },
    success: {
        inner: ["from-green-600"],
    },
});

export const modalClasses = reactiveIfDev({
    backdrop: [
        areaClasses.textColor.regular, // modals are teleported out of the normal flow.
        "modal-backdrop",
        "fixed",
        "top-0",
        "left-0",
        "flex",
        "justify-center",
        "items-center",
        "w-full",
        "h-full",
        "z-[60]",
        "bg-white/60",
        "dark:bg-material-black/90",
    ],
    wrapper: [
        "modal-wrapper",
        "flex",
        "flex-col",
        "drop-shadow",
        "max-h-screen",
        "max-w-screen",
        areaClasses.site.paddingX,
        areaClasses.site.paddingSmY,
    ],
    header: [
        "flex-none",
        "flex",
        // hack: items-baseline does not work here as expected in firefox,
        //  it aligns the left text to the bottom of the right button instead of the text of the button.
        //  the additional padding on icon and title fixes this.
        // "items-baseline",
        "items-start",
        "justify-between",
        "text-lg",
        areaClasses.site.gap,
        areaClasses.site.paddingSmX,
        areaClasses.site.paddingXsY,
        "shadow-[inset_0_1px_0]",
        "shadow-white/25",
        "bg-neutral-200",
        "dark:bg-neutral-700",
        "drop-shadow",
    ],
    title: ["flex-1", "font-medium", "pt-[0.438rem]"],
    content: [
        "grow",
        "border-t-0",
        areaClasses.site.paddingSm,
        "bg-neutral-100",
        "dark:bg-neutral-900",
        "overflow-y-auto",
    ],
    icon: ["pt-[0.438rem]"],
});

export const formSectionTitleClasses = reactiveIfDev({
    outer: [],
    header: ["flex", "flex-row", "items-baseline", areaClasses.site.gapSm],
    title: ["text-2xl"],
    spacer: ["w-full", "flex-1", "border-neutral-300", "dark:border-neutral-600", "border-t-2"],
    help: [areaClasses.textColor.muted, "text-sm"],
    messages: [],
    message: [],
});

export const formSectionClasses = reactiveIfDev({
    outer: [areaClasses.site.marginB, areaClasses.site.paddingSmY],
    inner: [areaClasses.site.paddingXsX],
});

export const tabularInlineClasses = reactiveIfDev({
    section: [areaClasses.site.marginB, areaClasses.site.paddingSmY, "max-w-max"],
    items: [areaClasses.site.paddingXsX],
    footer: [areaClasses.site.marginSmY],
});

export const stackedInlineClasses = reactiveIfDev({
    section: [areaClasses.site.marginB, areaClasses.site.paddingSmY, "max-w-max"],
    items: ["flex", "flex-col", areaClasses.site.gap, areaClasses.site.paddingXsX],
    item: [
        "border-t-2",
        "border-neutral-300",
        "dark:border-neutral-600",
        "first-of-type:border-transparent",
        "dark:first-of-type:border-transparent",
        "bg-neutral-100",
        "dark:bg-neutral-900",
    ],
    footer: [areaClasses.site.marginSmY],
});

export const dropZoneClasses = reactiveIfDev({
    outer: [
        "border-4",
        "border-dashed",
        "border-neutral-300",
        "dark:border-neutral-600",
        areaClasses.site.paddingSm,
        areaClasses.site.marginB,
    ],
    dragging: ["bg-neutral-300", "dark:bg-neutral-600", "border-neutral-400", "dark:border-neutral-500"],
});
