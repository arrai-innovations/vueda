/**
 * @module theme/vueda-tailwind/shell/SheetContent.theme
 *
 * Per-component theme registration for SheetContent. Imported as a side effect by
 * SheetContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetContent styles side or edge-attached sheet surfaces and their close affordance.
     */
    SheetContent: {
        /**
         * The edge-attached sheet surface. It maps the `side` prop to slide direction, edge border, size, and overlay shadow while preserving a flex column body.
         */
        root: ({ side }) => {
            const sideClasses = {
                right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
                left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
                bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
            };
            return {
                class: [
                    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-vueda-overlay transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
                    sideClasses[side] || sideClasses.right,
                ],
            };
        },
        /**
         * The close control inside a sheet. It stays visually quiet until hover or focus and uses the same keyboard focus outline as dialog close controls.
         */
        close: {
            class: "data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:focus-ring disabled:pointer-events-none text-sm leading-none",
        },
    },
});
