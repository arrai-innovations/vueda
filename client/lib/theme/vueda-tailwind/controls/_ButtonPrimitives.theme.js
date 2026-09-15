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
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Composition primitive: the layout, typography, and transition shell
     * shared by every Button cell. Composed by Button and by any leaf
     * (FileUpload trigger, CalendarCellTrigger, etc.) that needs the button
     * shape without committing to a colour treatment.
     */
    _ButtonBase: {
        /** The shared button shell: inline-flex layout, 2px control radius, sm font-medium type, default 16px icon sizing, focus-visible ring, and the system-wide disabled treatment. Height and horizontal padding are omitted; the leaf picks a tier from `base.css § Control sizing`. */
        root: {
            class: [
                // Layout and type.
                "inline-flex items-center justify-center gap-2 whitespace-nowrap",
                "rounded-vueda-control text-sm font-medium transition-all",

                // Disabled state.
                "disabled:pointer-events-none disabled:opacity-50",

                // Icons and child elements.
                "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
                "shrink-0 [&_svg]:shrink-0",

                // Focus and invalid states.
                "focus-visible:focus-ring",
                "aria-invalid:hairline aria-invalid:hairline-destructive",
            ],
        },
    },

    /**
     * Composition primitive: the primary-color fill cell for Button.
     * Composed into Button.root when `tone` is `primary` and `emphasis` is `fill`.
     */
    _ButtonDefault: {
        /** The `--primary` CTA fill: solid primary background, primary-foreground text. Hover and active swap the fill to the `--primary-hover` / `--primary-active` lightness steps (darker in light mode, lighter in dark) so the state change clears the glance-detection threshold rather than washing out the way the old `/90` alpha fade did. Pair sparingly with neutral pressed-state recipes like {@api theme-key:Toggle.root} so a CTA and an active toggle do not compete. */
        root: { class: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active" },
    },

    /**
     * Composition primitive: the destructive-color fill cell for Button.
     * Composed into Button.root when `tone` is `destructive` and `emphasis` is `fill`.
     */
    _ButtonDestructive: {
        /** The `--destructive` fill: solid destructive background in light mode, 60%-mix in dark so the chip stays legible against `--background` at rest, destructive-foreground text, and a destructive-tinted focus outline. Hover and active swap to the `--destructive-hover` / `--destructive-active` lightness steps (darker in light mode, lighter in dark). Reserve for actions that delete user data or are otherwise irreversible; menu / list destructive items use a colour-only recipe. */
        root: {
            class: [
                // Surface and color.
                "bg-destructive text-destructive-foreground",

                // Interactive and focus states.
                "hover:bg-destructive-hover active:bg-destructive-active focus-visible:outline-destructive",
                "dark:bg-destructive/60",
            ],
        },
    },

    /**
     * Composition primitive: the neutral outline-on-background cell for Button.
     * Composed into Button.root when `tone` is `neutral` and `emphasis` is
     * `outline`, and reused by
     * non-Button leaves that want the same neutral chip treatment (e.g.
     * FileUpload.trigger, RangeCalendarPrevButton).
     */
    _ButtonOutline: {
        /** The neutral-chip recipe: DPR-aware hairline at `--border-strong` that darkens to `--foreground` on hover (a chip that still reads as a control without outweighing the one filled action beside it), `--background` fill, `shadow-vueda-control` micro-shadow, and an `--accent` hover swap with an `--accent-active` pressed step. The hairline paints as an inset shadow rather than a layout border, so outlined buttons match fill-button intrinsic width while using the same chromatic-fringing mitigation as inputs. Hover / active use the mode-aware `--accent` tokens in both light and dark, so the lightness step is identical in either mode; only the *rest* fill differs (dark mode keeps the input-tint convention, `bg-input/30`, so an outlined chip reads input-like at rest while keeping its stronger edge). The earlier dark-mode `bg-input/50` hover topped out near the rest lightness because `--input` is itself dark, leaving the smaller sizes with no perceptible state change. Reused by chip-shaped leaves that want the button shape without a fill, including {@api theme-key:FileUpload.trigger} and the calendar prev / next buttons, so the hover and pressed steps reach those surfaces too. */
        root: {
            class: [
                // Shape and surface.
                "hairline hairline-border-strong bg-background text-foreground shadow-vueda-control",

                // Interactive states.
                "hover:hairline-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent-active dark:bg-input/30",
            ],
        },
    },

    /**
     * Composition primitive: the neutral fill cell for Button.
     * Composed into Button.root when `tone` is `neutral` and `emphasis` is `fill`.
     */
    _ButtonSecondary: {
        /** The `--secondary` surface fill: solid secondary background, secondary-foreground text. Hover and active swap to the `--secondary-hover` / `--secondary-active` lightness steps (darker in light mode, lighter in dark); the previous `/80` alpha hover was near-invisible because secondary sits almost on the page surface. Use for actions that sit beside a CTA without stealing it; a row of secondary buttons reads as a control cluster rather than a set of competing CTAs. */
        root: { class: "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active" },
    },

    /**
     * Composition primitive: the neutral ghost cell for Button (background
     * appears on hover only). Composed into Button.root when `tone` is `neutral`
     * and `emphasis` is `ghost`, and reused by CalendarCellTrigger /
     * RangeCalendarCellTrigger so day buttons share the same hover recipe.
     */
    _ButtonGhost: {
        /** The transparent-at-rest recipe: no fill or edge until hover, when `--accent` paints the background, with an `--accent-active` pressed step (dark mode: half-strength `accent/50` hover, full `accent` active). Shared by {@api theme-key:CalendarCellTrigger.root} and {@api theme-key:RangeCalendarCellTrigger.root} so day buttons in a calendar grid keep one consistent hover and press affordance; dark-mode hover is half-strength accent so the day button does not over-saturate the popover surface. */
        root: {
            class: [
                // Interactive states.
                "hover:bg-accent hover:text-accent-foreground active:bg-accent-active",
                "dark:hover:bg-accent/50 dark:active:bg-accent",
            ],
        },
    },

    /**
     * Composition primitive: the primary inline-text cell for Button (no control
     * height, no horizontal padding, underline on hover). Composed into
     * Button.root when `tone` is `primary` and `emphasis` is `link`; intended
     * for use inside running text rather than as a standalone control.
     */
    _ButtonLink: {
        /** The inline-text recipe: `--primary` text with a 4px underline offset that appears on hover only; active deepens the text to `--primary-active`. The `link` emphasis of {@api theme-key:Button} also drops the control height and horizontal padding so the affordance does not break surrounding line metrics. */
        root: { class: "text-primary underline-offset-4 hover:underline active:text-primary-active" },
    },

    /**
     * Composition primitive: the primary-toned outline cell for Button.
     * Composed into Button.root for the `(primary, outline)` cell, the primary
     * sibling of {@api theme-key:_ButtonOutline}.
     */
    _ButtonPrimaryOutline: {
        /** The primary neutral-chip recipe: a DPR-aware `--primary` hairline and `--primary` text over the `--background` fill (dark mode keeps the outline-family `bg-input/30` rest tint), with the `shadow-vueda-control` micro-shadow. The inset hairline avoids layout-width drift against fill buttons and uses the same saturated-edge fringing mitigation as inputs. Hover and active wash a low-alpha `--primary` tint behind the label (`/10` then `/15`). The secondary-CTA treatment: it reads as accented without the full weight of a filled {@api theme-key:_ButtonDefault}, so it can sit beside the primary fill as the "other" emphasized action. */
        root: {
            class: [
                // Shape and surface.
                "hairline hairline-primary bg-background text-primary shadow-vueda-control dark:bg-input/30",

                // Interactive states.
                "hover:bg-primary/10 active:bg-primary/15",
            ],
        },
    },

    /**
     * Composition primitive: the destructive-toned outline cell for Button.
     * Composed into Button.root for the `(destructive, outline)` cell, the
     * destructive sibling of {@api theme-key:_ButtonOutline}.
     */
    _ButtonDestructiveOutline: {
        /** The destructive neutral-chip recipe: a DPR-aware `--destructive` hairline and `--destructive` text over the `--background` fill (dark mode keeps the outline-family `bg-input/30` rest tint), with the `shadow-vueda-control` micro-shadow. The inset hairline avoids layout-width drift against fill buttons and uses the same saturated-edge fringing mitigation as inputs. Hover and active wash a low-alpha `--destructive` tint behind the label (`/10` then `/15`) so the chip warms toward danger on interaction without becoming a filled destructive CTA, and focus swaps to the destructive outline. Use for a reversible-but-cautionary action that should not carry the weight of a filled {@api theme-key:_ButtonDestructive} (a low-emphasis delete in a toolbar or row). */
        root: {
            class: [
                // Shape and surface.
                "hairline hairline-destructive bg-background text-destructive shadow-vueda-control dark:bg-input/30",

                // Interactive and focus states.
                "hover:bg-destructive/10 active:bg-destructive/15 focus-visible:outline-destructive",
            ],
        },
    },

    /**
     * Composition primitive: the primary-toned ghost cell for Button.
     * Composed into Button.root for the `(primary, ghost)` cell, the primary
     * sibling of {@api theme-key:_ButtonGhost}.
     */
    _ButtonPrimaryGhost: {
        /** The transparent-at-rest primary recipe: `--primary` text with no fill or edge until hover, when a low-alpha `--primary` tint paints the background (`/10` hover, `/15` active). The lowest-weight accented affordance, for an emphasized action inside a dense cluster where an outline or fill would be too heavy. */
        root: {
            class: ["text-primary", "hover:bg-primary/10 active:bg-primary/15"],
        },
    },

    /**
     * Composition primitive: the destructive-toned ghost cell for Button.
     * Composed into Button.root for the `(destructive, ghost)` cell, the
     * destructive sibling of {@api theme-key:_ButtonGhost}.
     */
    _ButtonDestructiveGhost: {
        /** The transparent-at-rest destructive recipe: `--destructive` text with no fill or edge until hover, when a low-alpha `--destructive` tint paints the background (`/10` hover, `/15` active) and focus swaps to the destructive outline. The lowest-weight destructive affordance, for a cautionary action inside a dense cluster (a row's delete glyph, a menu-adjacent strip) where even an outlined chip would be too heavy. */
        root: {
            class: [
                "text-destructive",
                "hover:bg-destructive/10 active:bg-destructive/15 focus-visible:outline-destructive",
            ],
        },
    },

    /**
     * Composition primitive: the neutral-toned inline-text cell for Button.
     * Composed into Button.root for the `(neutral, link)` cell, the neutral
     * sibling of {@api theme-key:_ButtonLink}.
     */
    _ButtonNeutralLink: {
        /** The neutral inline-text recipe: `--foreground` text with a 4px underline offset that appears on hover only; active eases the label to 70% opacity. Unlike {@api theme-key:_ButtonLink}, it does not tint the text with `--primary`, so a row of quiet text actions does not spread the earned accent across every secondary affordance. The `link` emphasis of {@api theme-key:Button} also drops the control height and horizontal padding. */
        root: { class: "text-foreground underline-offset-4 hover:underline active:opacity-70" },
    },

    /**
     * Composition primitive: the destructive-toned inline-text cell for
     * Button. Composed into Button.root for the `(destructive, link)` cell.
     */
    _ButtonDestructiveLink: {
        /** The destructive inline-text recipe: `--destructive` text with a 4px underline offset that appears on hover only; active deepens the label to `--destructive-active`. The text-weight counterpart to {@api theme-key:_ButtonDestructive}, for a cautionary action that must read inline with prose rather than as a control. */
        root: { class: "text-destructive underline-offset-4 hover:underline active:text-destructive-active" },
    },
});
