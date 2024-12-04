import display from "@vueda/theme/vueda-tailwind/display/index.js";
import form from "@vueda/theme/vueda-tailwind/form/index.js";
import objectsGrid from "@vueda/theme/vueda-tailwind/objects-grid/index.js";
import views from "@vueda/theme/vueda-tailwind/views/index.js";
import widgets from "@vueda/theme/vueda-tailwind/widgets/index.js";

export default {
    ...objectsGrid,
    ...form,
    ...widgets,
    ...views,
    ...display,
    PaginationComponent: {
        root: {
            class: "card",
        },
        paginator: {
            class: [],
        },
    },
    StickyBar: {
        root: (args) => {
            return {
                class: {
                    "sticky top-[-1px] z-30": true,
                    "transition-transform duration-300 ease-in-out transform": true,
                    "translate-y-[-100%]": args?.hidden,
                    "translate-y-0": !args?.hidden,
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
};
