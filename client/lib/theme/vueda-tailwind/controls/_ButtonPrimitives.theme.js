/**
 * @module theme/vueda-tailwind/controls/_ButtonPrimitives.theme
 *
 * Shared Button composition primitives, registered eagerly via `patchTheme` at
 * module load. This is the single owning module for the `_Button*` primitives
 * that components compose from across family lines.
 *
 * Imported as a side effect by every `*.theme.js` whose component composes a
 * `_Button*` primitive, so the primitive is registered before that component's
 * `useTheme(...)` resolves. Known consumers (per the composes-graph map):
 *
 * - controls: Button, the Calendar / RangeCalendar nav + cell-trigger buttons.
 * - navigation: PaginationItem, NavigationPaginationNavButton.
 * - shell: AlertDialogAction, AlertDialogCancel.
 *
 * Composition resolves at `useTheme` lookup time, so import order does not
 * matter: a consumer only needs this module to have run by the time its own
 * slot is read.
 *
 * Prototype-phase duplication: this data mirrors the `_Button*` slice of
 * `controls/index.js`, which remains the docs-tooling source of truth until the
 * extractor learns to walk `*.theme.js`. Under the legacy `setTheme(...)` path
 * the wholesale replace overwrites this patch with identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    _ButtonBase: {
        root: {
            class: [
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-vueda-control text-sm font-medium transition-all",
                "disabled:pointer-events-none disabled:opacity-50",
                "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
                "focus-visible:focus-ring",
                "aria-invalid:border-destructive",
            ],
        },
    },
    _ButtonDefault: {
        root: { class: "bg-primary text-primary-foreground hover:bg-primary/90" },
    },
    _ButtonDestructive: {
        root: {
            class: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-destructive dark:bg-destructive/60",
        },
    },
    _ButtonOutline: {
        root: {
            class: "border bg-background shadow-vueda-control hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        },
    },
    _ButtonSecondary: {
        root: { class: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
    },
    _ButtonGhost: {
        root: { class: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50" },
    },
    _ButtonLink: {
        root: { class: "text-primary underline-offset-4 hover:underline" },
    },
});
