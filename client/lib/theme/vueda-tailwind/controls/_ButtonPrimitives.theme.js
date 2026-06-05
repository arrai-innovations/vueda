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
    /**
     * Composition primitive: the layout, typography, and transition shell
     * shared by every Button variant. Composed by Button and by any leaf
     * (FileUpload trigger, CalendarCellTrigger, etc.) that needs the button
     * shape without committing to a colour variant.
     */
    _ButtonBase: {
        /** The shared button shell: inline-flex layout, 2px control radius, sm font-medium type, default 16px icon sizing, focus-visible ring, and the system-wide disabled treatment. Height and horizontal padding are omitted; the leaf picks a tier from `base.css § Control sizing`. */
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

    /**
     * Composition primitive: the primary-color fill variant for Button.
     * Composed into Button.root when `variant` is `default`.
     */
    _ButtonDefault: {
        /** The `--primary` CTA fill: solid primary background, primary-foreground text, 10% darker on hover. Pair sparingly with neutral pressed-state recipes like {@api theme-key:Toggle.root} so a CTA and an active toggle do not compete. */
        root: { class: "bg-primary text-primary-foreground hover:bg-primary/90" },
    },

    /**
     * Composition primitive: the destructive-color fill variant for Button.
     * Composed into Button.root when `variant` is `destructive`.
     */
    _ButtonDestructive: {
        /** The `--destructive` fill: solid destructive background in light mode, 60%-mix in dark so the chip stays legible against `--background`, destructive-foreground text, and a destructive-tinted focus outline. Reserve for actions that delete user data or are otherwise irreversible; menu / list destructive items use a colour-only recipe. */
        root: {
            class: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-destructive dark:bg-destructive/60",
        },
    },

    /**
     * Composition primitive: the outline-on-background variant for Button.
     * Composed into Button.root when `variant` is `outline`, and reused by
     * non-Button leaves that want the same neutral chip treatment (e.g.
     * FileUpload.trigger, RangeCalendarPrevButton).
     */
    _ButtonOutline: {
        /** The neutral-chip recipe: 1px border, `--background` fill, `shadow-vueda-control` micro-shadow, and `--accent` hover swap. Dark mode follows the input-tint convention (`bg-input/30`, `border-input`, hover `bg-input/50`) so outlined chips read like inputs at rest. Reused by chip-shaped leaves that want the button shape without a fill, including {@api theme-key:FileUpload.trigger} and the calendar prev / next buttons. */
        root: {
            class: "border bg-background text-foreground shadow-vueda-control hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        },
    },

    /**
     * Composition primitive: the secondary-surface variant for Button.
     * Composed into Button.root when `variant` is `secondary`.
     */
    _ButtonSecondary: {
        /** The `--secondary` surface fill: solid secondary background, secondary-foreground text, 20%-lighter on hover. Use for actions that sit beside a CTA without stealing it; a row of secondary buttons reads as a control cluster rather than a set of competing CTAs. */
        root: { class: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
    },

    /**
     * Composition primitive: the transparent-at-rest variant for Button
     * (background appears on hover only). Composed into Button.root when
     * `variant` is `ghost`, and reused by CalendarCellTrigger /
     * RangeCalendarCellTrigger so day buttons share the same hover recipe.
     */
    _ButtonGhost: {
        /** The transparent-at-rest recipe: no fill or border until hover, when `--accent` paints the background. Shared by {@api theme-key:CalendarCellTrigger.root} and {@api theme-key:RangeCalendarCellTrigger.root} so day buttons in a calendar grid keep one consistent hover affordance; dark-mode hover is half-strength accent so the day button does not over-saturate the popover surface. */
        root: { class: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50" },
    },

    /**
     * Composition primitive: the inline-text variant for Button (no control
     * height, no horizontal padding, underline on hover). Composed into
     * Button.root when `variant` is `link`; intended for use inside running
     * text rather than as a standalone control.
     */
    _ButtonLink: {
        /** The inline-text recipe: `--primary` text with a 4px underline offset that appears on hover only. The `link` variant of {@api theme-key:Button} also drops the control height and horizontal padding so the affordance does not break surrounding line metrics. */
        root: { class: "text-primary underline-offset-4 hover:underline" },
    },
});
