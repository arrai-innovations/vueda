/**
 * @module theme/vueda-tailwind/controls
 * @description Tailwind CSS theme configuration for VUEDA Client control primitives.
 */

export default {
    // ---------- Button family meta keys ----------
    // Underscore-prefixed entries are composition primitives consumed by leaf
    // entries via `composes`. They are full theme entries and can be overridden
    // through setTheme / useThemeOverride; overriding `_ButtonBase` propagates
    // to every leaf that composes from it.

    /**
     * Composition primitive: the layout, typography, and transition shell
     * shared by every Button variant. Composed by Button and by any leaf
     * (FileUpload trigger, CalendarCellTrigger, etc.) that needs the button
     * shape without committing to a colour variant.
     */
    _ButtonBase: {
        /** The shared button shell: inline-flex layout, 2px control radius, sm font-medium type, default 16px icon sizing, focus-visible ring, and the system-wide disabled treatment. Height and horizontal padding are omitted; the leaf picks a tier from `base.css § Control sizing`. See DESIGN.md § Buttons / toggles / kbd. */
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
        /** The `--primary` CTA fill: solid primary background, primary-foreground text, 10% darker on hover. Pair sparingly with neutral pressed-state recipes like {@api theme-key:Toggle.root} so a CTA and an active toggle do not compete; see DESIGN.md § 2.2. */
        root: { class: "bg-primary text-primary-foreground hover:bg-primary/90" },
    },

    /**
     * Composition primitive: the destructive-color fill variant for Button.
     * Composed into Button.root when `variant` is `destructive`.
     */
    _ButtonDestructive: {
        /** The `--destructive` fill: solid destructive background in light mode, 60%-mix in dark so the chip stays legible against `--background`, destructive-foreground text, and a destructive-tinted focus outline. Reserve for actions that delete user data or are otherwise irreversible; menu / list destructive items use a colour-only recipe (see DESIGN.md § Overlays / menus). */
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
        /** The neutral-chip recipe: 1px border, `--background` fill, `shadow-vueda-control` micro-shadow, and `--accent` hover swap. Dark mode follows the input-tint convention (`bg-input/30`, `border-input`, hover `bg-input/50`) so outlined chips read like inputs at rest; see DESIGN.md § Inputs. Reused by chip-shaped leaves that want the button shape without a fill, including {@api theme-key:FileUpload.trigger} and the calendar prev / next buttons. */
        root: {
            class: "border bg-background shadow-vueda-control hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
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
        /** The inline-text recipe: `--primary` text with a 4px underline offset that appears on hover only. The `link` variant of {@api theme-key:Button} also drops the control height and horizontal padding so the affordance does not break surrounding line metrics; see DESIGN.md § Buttons / toggles / kbd. */
        root: { class: "text-primary underline-offset-4 hover:underline" },
    },

    // ---------- Button ----------

    /**
     * The standard pressable control. Variants pick which `_Button*` primitive
     * composes into the root (`default`, `destructive`, `outline`, `secondary`,
     * `ghost`, `link`); `size` picks the control-height tier (`default`, `sm`,
     * `lg`, plus `icon` / `icon-sm` / `icon-lg`). The `link` variant is
     * inline-flow and skips the control-height + padding recipe.
     */
    Button: {
        /** The pressable root. Composes {@api theme-key:_ButtonBase.root} plus the variant primitive named by `variant`, then layers the per-size height / padding pair from `base.css § Control sizing` (or `size-vueda-control*` for icon-only sizes). The `link` variant skips the control-height block and goes inline. The `data-state=cooldown` state (set by the component while a one-shot action is recovering) mutes the label to `--muted-foreground` and suppresses hover so a recently-clicked button reads as "wait" without changing layout. */
        root: ({ variant, size }) => {
            const v = variant || "default";
            const variantKey = `_Button${v.charAt(0).toUpperCase()}${v.slice(1)}.root`;
            const cooldownClass = [
                "data-[state=cooldown]:text-muted-foreground",
                "data-[state=cooldown]:cursor-default",
                "data-[state=cooldown]:hover:bg-transparent",
                "data-[state=cooldown]:hover:text-muted-foreground",
            ];
            if (v === "link") {
                return {
                    composes: ["_ButtonBase.root", variantKey],
                    class: ["h-auto px-0", ...cooldownClass],
                };
            }
            return {
                composes: ["_ButtonBase.root", variantKey],
                class: [
                    {
                        "h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm":
                            !size || size === "default",
                        "h-vueda-control-sm gap-1.5 px-vueda-control-px-sm has-[>svg]:px-vueda-control-px-sm":
                            size === "sm",
                        "h-vueda-control-lg px-vueda-control-px-lg has-[>svg]:px-vueda-control-px": size === "lg",
                        "size-vueda-control": size === "icon",
                        "size-vueda-control-sm": size === "icon-sm",
                        "size-vueda-control-lg": size === "icon-lg",
                    },
                    ...cooldownClass,
                ],
            };
        },
    },

    // ---------- Button group ----------

    /**
     * Layout shell that joins adjacent controls into a single segmented unit.
     * Strips inner radii and borders so the children read as one slab; supports
     * horizontal (default) and vertical orientation.
     */
    ButtonGroup: {
        /** The segmented-cluster shell. Strips inner radii and shared borders between adjacent children so a row (or column when `orientation` is `vertical`) of buttons, inputs, and Select triggers reads as one slab; focus z-index promotion keeps the focus ring from being clipped by neighbours. Nested {@api theme-key:ButtonGroup} children retain an 8px gap. The icon-only-stays-seamless / text-or-mixed-keeps-seams rule is applied by the component, not this slot; see DESIGN.md § Buttons / toggles / kbd. */
        root: ({ orientation }) => ({
            class: [
                "flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2",
                {
                    "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none":
                        !orientation || orientation === "horizontal",
                    "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none":
                        orientation === "vertical",
                },
            ],
        }),
    },

    /**
     * 1px vertical (or horizontal) divider between joined items inside a
     * ButtonGroup.
     */
    ButtonGroupSeparator: {
        /** The explicit divider used inside a {@api theme-key:ButtonGroup} when the segmented cluster needs a visible split between text segments. Uses the `--input` token so the divider matches the surrounding hairline color in both modes, and stretches to the group's cross-axis. */
        root: {
            class: ["bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto"],
        },
    },

    /**
     * Static text segment inside a ButtonGroup; reads as a label-style chip
     * joined to its neighbouring controls.
     */
    ButtonGroupText: {
        /** The static-label chip used to join readable copy ("of", "to", a unit suffix) into a {@api theme-key:ButtonGroup}. Wears the button shape (2px control radius, 1px border, `shadow-vueda-control`) but sits on `--muted` so it does not read as pressable; padding picks 16px to match the default button's `px-vueda-control-px` baseline. */
        root: {
            class: [
                "bg-muted flex items-center gap-2 rounded-vueda-control border px-4 text-sm font-medium shadow-vueda-control [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },

    // ---------- Toggle ----------

    /**
     * A button-shaped on/off control. Differs from Button in that the pressed
     * state is a neutral "this view is active" affordance (`--accent`), not a
     * CTA (`--primary`).
     */
    Toggle: {
        /** The on/off button shell. Reads as a Button shape (control radius, `text-sm font-medium`, 16px icon) but the pressed state (`data-state=on`) paints `--accent` instead of `--primary` so a pressed toggle does not compete with a CTA on the same surface; see DESIGN.md § Buttons / toggles / kbd and § 2.2. Two variants (default, `outline`) and three size tiers ride the shared `h-vueda-control*` scale; `min-w-vueda-control*` keeps a single-icon toggle square. */
        root: ({ variant, size }) => ({
            class: [
                "inline-flex items-center justify-center gap-2 rounded-vueda-control text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:hairline-ring focus-visible:focus-ring-shadow transition-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive whitespace-nowrap",
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-input bg-transparent shadow-vueda-control hover:bg-accent hover:text-accent-foreground":
                        variant === "outline",
                },
                {
                    "h-vueda-control px-2 min-w-vueda-control": !size || size === "default",
                    "h-vueda-control-sm px-1.5 min-w-vueda-control-sm": size === "sm",
                    "h-vueda-control-lg px-2.5 min-w-vueda-control-lg": size === "lg",
                },
            ],
        }),
    },

    /**
     * Layout shell for a row of ToggleGroupItems.
     */
    ToggleGroup: {
        /** The row layout for a set of {@api theme-key:ToggleGroupItem.root} children. The `--gap` custom property is driven by the consumer's `spacing` prop, which lets the same group render as a gapped row or (at `spacing=0`) as a segmented control where child items drop their outer radii and shared borders. The `group/toggle-group` Tailwind group label lets items react to group-level state. */
        root: {
            class: ["group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-vueda-control"],
        },
    },

    /**
     * Individual toggle inside a ToggleGroup. Supports the same `variant` /
     * `size` set as Toggle; when `data-spacing` is `0`, items join into a
     * segmented unit (rounded only on the outer corners, shared borders).
     */
    ToggleGroupItem: {
        /** The individual item inside a {@api theme-key:ToggleGroup}. Mirrors the {@api theme-key:Toggle.root} recipe (same variants, sizes, and accent-pressed treatment) and adds segmented behaviour: when the host group sets `data-spacing=0`, items drop their per-item radius and shadow and re-add them on the first and last child so the cluster reads as one slab. `min-w-0 shrink-0 px-3` overrides the Toggle minimum width so a label-bearing item grows to its content rather than staying square. */
        root: ({ variant, size }) => ({
            class: [
                "inline-flex items-center justify-center gap-2 rounded-vueda-control text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:hairline-ring focus-visible:focus-ring-shadow transition-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive whitespace-nowrap",
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-input bg-transparent shadow-vueda-control hover:bg-accent hover:text-accent-foreground":
                        variant === "outline",
                },
                {
                    "h-vueda-control px-2 min-w-vueda-control": !size || size === "default",
                    "h-vueda-control-sm px-1.5 min-w-vueda-control-sm": size === "sm",
                    "h-vueda-control-lg px-2.5 min-w-vueda-control-lg": size === "lg",
                },
                "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
                "data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
            ],
        }),
    },

    // ---------- File upload ----------

    /**
     * File-picker control. Supports an inline-trigger mode and a dropzone
     * mode; the dropzone variant adds a dashed-border target that highlights
     * while a file is being dragged over it.
     */
    FileUpload: {
        /** The outer container. In inline-trigger mode this is a tight flex column wrapping the picker button plus optional helper text; in `dropzone` mode it grows into a dashed-border target (2px input-coloured dashes, 6 spacing pad, large radius) that highlights with a primary-tinted fill when `dragging`. The `disabled` state dims the whole region and switches the cursor; the inner trigger still picks up its own disabled treatment from {@api theme-key:_ButtonBase.root}. */
        root: ({ dropzone, dragging, disabled }) => ({
            class: [
                "inline-flex flex-col items-center gap-1",
                {
                    "rounded-lg border-2 border-dashed border-input p-6 transition-colors": dropzone,
                    "border-primary bg-primary/5": dropzone && dragging,
                    "opacity-50 cursor-not-allowed": disabled,
                },
            ],
        }),
        /** The "choose file" affordance. Composes {@api theme-key:_ButtonBase.root} plus {@api theme-key:_ButtonOutline.root} so the trigger reads as the same neutral chip as an outline-variant {@api theme-key:Button.root}, at the default control height with the icon-aware narrower padding kicking in when the trigger carries an icon. */
        trigger: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm"],
        },
        /** The "or drop here" helper line below the trigger. Muted secondary text at the sm tier so it sits as ancillary copy and never competes with the trigger label or a selected-file readout. */
        dropMessage: {
            class: ["text-sm text-muted-foreground"],
        },
    },

    // ---------- Text input ----------

    /**
     * Single-line text input. The reference input-shell control: input-tinted
     * hairline, control-height scale, focus ring, `aria-invalid` swap,
     * read-only and disabled states.
     */
    Input: {
        root: {
            class: [
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 hairline h-vueda-control w-full min-w-0 rounded-vueda-control bg-transparent px-vueda-control-px text-base shadow-vueda-control transition-shadow file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
                "read-only:bg-muted/50 read-only:cursor-default",
            ],
        },
    },

    /**
     * Multi-line text input. Shares the input-shell treatment with Input but
     * expands vertically via `field-sizing: content`.
     */
    Textarea: {
        root: {
            class: [
                "placeholder:text-muted-foreground dark:bg-input/30 hairline flex field-sizing-content min-h-16 w-full rounded-vueda-control bg-transparent px-3 py-2 text-base shadow-vueda-control transition-shadow disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:hairline-ring focus-visible:focus-ring-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },

    // ---------- Input group ----------

    /**
     * Wrapper that joins an Input (or Textarea) with one or more addons (icon,
     * button, kbd, helper text) into a single bordered shell. The group owns
     * the hairline and focus-ring; children render without borders of their
     * own.
     */
    InputGroup: {
        root: {
            class: [
                "group/input-group dark:bg-input/30 hairline relative flex w-full items-center rounded-vueda-control shadow-vueda-control transition-shadow",
                "h-vueda-control min-w-0 has-[>textarea]:h-auto",
                "has-[>[data-align=inline-start]]:[&>input]:pl-2",
                "has-[>[data-align=inline-end]]:[&>input]:pr-2",
                "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
                "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
                "has-[[data-slot=input-group-control]:focus-visible]:hairline-ring has-[[data-slot=input-group-control]:focus-visible]:focus-ring-shadow",
                "has-[[data-slot][aria-invalid=true]]:hairline-destructive has-[[data-slot][aria-invalid=true]:focus-visible]:focus-ring-shadow-destructive",
            ],
        },
    },

    /**
     * Decorative or interactive content positioned inside an InputGroup.
     * `align` controls placement (`inline-start`, `inline-end`, `block-start`,
     * `block-end`); inline addons sit flush against the input edge, block
     * addons stack above or below it.
     */
    InputGroupAddon: {
        root: ({ align }) => ({
            class: [
                "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)] group-data-[disabled=true]/input-group:opacity-50",
                {
                    "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]":
                        !align || align === "inline-start",
                    "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]": align === "inline-end",
                    "order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5":
                        align === "block-start",
                    "order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5":
                        align === "block-end",
                },
            ],
        }),
    },

    /**
     * The text input child inside an InputGroup. Strips its own border /
     * shadow so the InputGroup shell owns the chrome.
     */
    InputGroupInput: {
        root: {
            class: ["flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"],
        },
    },

    /**
     * The textarea child inside an InputGroup. Strips its own border / shadow
     * so the InputGroup shell owns the chrome.
     */
    InputGroupTextarea: {
        root: {
            class: [
                "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
            ],
        },
    },

    /**
     * Inline text addon (helper text, prefix / suffix label) inside an
     * InputGroup.
     */
    InputGroupText: {
        root: {
            class: [
                "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },

    /**
     * Pressable addon inside an InputGroup. Sized smaller than a standalone
     * Button (xs, sm, icon-xs, icon-sm tiers) so it fits inside the input
     * shell.
     */
    InputGroupButton: {
        root: ({ size }) => ({
            class: [
                "text-sm shadow-none flex gap-2 items-center",
                {
                    "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2":
                        !size || size === "xs",
                    "h-vueda-control-sm px-vueda-control-px-sm gap-1.5 rounded-vueda-control has-[>svg]:px-vueda-control-px-sm":
                        size === "sm",
                    "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0": size === "icon-xs",
                    "size-vueda-control-sm p-0 has-[>svg]:p-0": size === "icon-sm",
                },
            ],
        }),
    },

    // ---------- Input OTP ----------

    /**
     * One-time-password input rendered as a row of fixed-width slots. Slots
     * focus independently; the active slot is highlighted by the ring.
     */
    InputOTP: {
        root: {
            class: [
                "flex items-center gap-2 has-disabled:opacity-50",
                "has-[[data-active=true]]:focus-ring",
                "aria-invalid:has-[[data-active=true]]:focus-ring-destructive",
            ],
        },
    },

    /**
     * A run of contiguous InputOTPSlots (e.g. the three digits of a 3-3 split
     * code).
     */
    InputOTPGroup: {
        root: {
            class: ["flex items-center"],
        },
    },

    /**
     * Individual character cell inside an InputOTPGroup. Borders join into a
     * single hairline across the run; the active slot is outlined by the ring.
     */
    InputOTPSlot: {
        root: {
            class: [
                "dark:bg-input/30 border-hairline border-input relative flex h-vueda-control w-vueda-control items-center justify-center text-sm shadow-vueda-control transition-all first:rounded-l-md last:rounded-r-md [&:not(:first-child)]:[margin-left:calc(-1*var(--vueda-hairline-width))] data-[active=true]:z-10 data-[active=true]:border-ring aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive",
            ],
        },
    },

    // ---------- Native select ----------

    /**
     * Native `<select>` styled to match the VUEDA control shell. Used where a
     * JS-driven combobox or select would be overkill (short fixed enums on
     * touch devices, fallback contexts).
     */
    NativeSelect: {
        root: {
            class: [
                "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 hairline h-vueda-control w-full min-w-0 appearance-none rounded-vueda-control bg-transparent px-vueda-control-px pr-9 text-sm shadow-vueda-control transition-shadow disabled:pointer-events-none disabled:cursor-not-allowed",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },

    /**
     * Native `<optgroup>` styled to inherit the popover surface.
     */
    NativeSelectOptGroup: {
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },

    /**
     * Native `<option>` styled to inherit the popover surface.
     */
    NativeSelectOption: {
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },

    // ---------- Number field ----------

    /**
     * Numeric input with optional increment / decrement steppers. The stepper
     * slots can be hidden, allowing a plain numeric Input.
     */
    NumberField: {
        root: {
            class: ["grid gap-1.5"],
        },
    },

    /**
     * Inner wrapper around NumberFieldInput; reserves horizontal space for
     * the increment / decrement slots when they are present.
     */
    NumberFieldContent: {
        root: {
            class: [
                "relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5",
            ],
        },
    },

    /**
     * Numeric `<input>` inside NumberField. Mono + tabular numerals,
     * centre-aligned, so digit widths stay stable during step changes.
     */
    NumberFieldInput: {
        root: {
            class: [
                "flex h-vueda-control w-full rounded-vueda-control hairline bg-transparent font-mono tabular-nums text-sm text-center shadow-vueda-control transition-shadow placeholder:text-muted-foreground focus-visible:hairline-ring focus-visible:focus-ring-shadow disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },

    /**
     * Decrement stepper button anchored to the left of NumberFieldInput.
     */
    NumberFieldDecrement: {
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20"],
        },
    },

    /**
     * Increment stepper button anchored to the right of NumberFieldInput.
     */
    NumberFieldIncrement: {
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 right-0 disabled:cursor-not-allowed disabled:opacity-20 p-3"],
        },
    },

    // ---------- Date / time fields ----------

    /**
     * Date picker rendered as a row of editable date segments (year / month /
     * day). Shares the input shell with Input; segments are individually
     * focusable and increment with arrow keys.
     */
    DateField: {
        root: ({ size }) => ({
            class: [
                "dark:bg-input/30 flex w-full items-center rounded-vueda-control hairline bg-transparent text-sm shadow-vueda-control transition-shadow focus-within:hairline-ring focus-within:focus-ring-shadow data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:hairline-destructive focus-within:aria-invalid:focus-ring-shadow-destructive",
                {
                    "h-vueda-control px-vueda-control-px": !size || size === "default",
                    "h-vueda-control-sm px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg": size === "lg",
                },
            ],
        }),
    },

    /**
     * Individual date segment inside DateField. Mono + tabular + slashed-zero
     * so digit widths and 0/O distinction stay stable; focused segment
     * highlights with `--accent`.
     */
    DateFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero'] caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },

    /**
     * Two-DateField row representing a start / end date pair, joined into a
     * single shell.
     */
    DateRangeField: {
        root: ({ size }) => ({
            class: [
                "dark:bg-input/30 flex w-full items-center rounded-vueda-control hairline bg-transparent text-sm shadow-vueda-control transition-shadow focus-within:hairline-ring focus-within:focus-ring-shadow data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:hairline-destructive focus-within:aria-invalid:focus-ring-shadow-destructive",
                {
                    "h-vueda-control px-vueda-control-px": !size || size === "default",
                    "h-vueda-control-sm px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg": size === "lg",
                },
            ],
        }),
    },

    /**
     * Individual date segment inside DateRangeField. Same recipe as
     * DateFieldInput.
     */
    DateRangeFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero'] caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },

    /**
     * Time picker rendered as a row of editable time segments (hour / minute,
     * optional second / period). Shares the input shell with DateField.
     */
    TimeField: {
        root: ({ size }) => ({
            class: [
                "dark:bg-input/30 flex w-full items-center rounded-vueda-control hairline bg-transparent text-sm shadow-vueda-control transition-shadow focus-within:hairline-ring focus-within:focus-ring-shadow data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:hairline-destructive focus-within:aria-invalid:focus-ring-shadow-destructive",
                {
                    "h-vueda-control px-vueda-control-px": !size || size === "default",
                    "h-vueda-control-sm px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg": size === "lg",
                },
            ],
        }),
    },

    /**
     * Individual time segment inside TimeField. Same recipe as DateFieldInput.
     */
    TimeFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero'] caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },

    // ---------- Calendar ----------

    /**
     * Single-date calendar grid. Composed inside date-picker popovers, or
     * embedded inline when a full grid is the primary surface.
     */
    Calendar: {
        root: {
            class: ["p-3"],
        },
    },

    /**
     * Title row above the Calendar grid. Holds the heading and the prev / next
     * nav buttons.
     */
    CalendarHeader: {
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full px-8"],
        },
    },

    /**
     * The month-year title text inside a CalendarHeader.
     */
    CalendarHeading: {
        root: {
            class: ["text-sm font-medium"],
        },
    },

    /**
     * Prev / next month button inside a CalendarHeader. One theme key serves
     * both directional buttons (CalendarPrevButton.vue and
     * CalendarNextButton.vue), which diverges from the
     * RangeCalendarPrevButton / RangeCalendarNextButton split; see
     * BACKLOG-011 for the reconciliation question.
     */
    CalendarNavButton: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },

    /**
     * The 7-column day grid inside Calendar.
     */
    CalendarGrid: {
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },

    /**
     * A single week row inside a CalendarGrid.
     */
    CalendarGridRow: {
        root: {
            class: ["flex"],
        },
    },

    /**
     * A weekday-label cell (Mo / Tu / We ...) above the day grid.
     */
    CalendarHeadCell: {
        root: {
            class: ["text-muted-foreground rounded-md w-[var(--vueda-cal-cell)] font-normal text-[0.8rem]"],
        },
    },

    /**
     * A grid slot inside a CalendarGridRow; the day button sits inside it.
     */
    CalendarCell: {
        root: {
            class: ["relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1"],
        },
    },

    /**
     * The pressable day button inside a CalendarCell. Carries the today,
     * selected, disabled, unavailable, and outside-view states; composes the
     * ghost-button recipe for hover.
     */
    CalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: [
                "size-[var(--vueda-cal-day)] p-0 font-normal aria-selected:opacity-100 cursor-default",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive data-[unavailable]:line-through",
                "data-[outside-view]:text-muted-foreground",
            ],
        },
    },

    /**
     * Optional chin below a Calendar (or RangeCalendar) carrying a date
     * summary and an action row (Apply / Clear). Used by date-picker popovers
     * that need a status line plus actions; the bare Calendar stays
     * footer-free so it can be embedded without chrome it cannot use.
     */
    CalendarFooter: {
        root: {
            class: ["flex items-center justify-between gap-2 mt-2 pt-2 border-t"],
        },
        summary: {
            class: [
                "font-mono font-medium text-[length:var(--vueda-text-supporting)] leading-none text-muted-foreground [font-feature-settings:'tnum','zero']",
            ],
        },
    },

    // ---------- Range calendar ----------

    /**
     * Two-bookend calendar grid for selecting a start / end date pair.
     * Composed inside date-range-picker popovers.
     */
    RangeCalendar: {
        root: {
            class: ["p-3"],
        },
    },

    /**
     * Title row above the RangeCalendar grid. Holds the heading and the
     * prev / next nav buttons.
     */
    RangeCalendarHeader: {
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full"],
        },
    },

    /**
     * The month-year title text inside a RangeCalendarHeader.
     */
    RangeCalendarHeading: {
        root: {
            class: ["text-sm font-medium"],
        },
    },

    /**
     * Previous-month button inside a RangeCalendarHeader. Positioned absolute
     * to the left edge of the header.
     */
    RangeCalendarPrevButton: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },

    /**
     * Next-month button inside a RangeCalendarHeader. Positioned absolute to
     * the right edge of the header.
     */
    RangeCalendarNextButton: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },

    /**
     * The 7-column day grid inside RangeCalendar.
     */
    RangeCalendarGrid: {
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },

    /**
     * A single week row inside a RangeCalendarGrid.
     */
    RangeCalendarGridRow: {
        root: {
            class: ["flex"],
        },
    },

    /**
     * A weekday-label cell above the RangeCalendar day grid.
     */
    RangeCalendarHeadCell: {
        root: {
            class: ["w-[var(--vueda-cal-cell)] rounded-md text-[0.8rem] font-normal text-muted-foreground"],
        },
    },

    /**
     * A grid slot inside a RangeCalendarGridRow. Carries the range-fill
     * background so selection-start / end corners round independently of the
     * day button radius.
     */
    RangeCalendarCell: {
        root: {
            class: [
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-vueda-cal-day last:[&:has([data-selected])]:rounded-r-vueda-cal-day [&:has([data-selected][data-selection-end])]:rounded-r-vueda-cal-day [&:has([data-selected][data-selection-start])]:rounded-l-vueda-cal-day",
            ],
        },
    },

    /**
     * The pressable day button inside a RangeCalendarCell. Carries the
     * selection-start / selection-end states alongside today, disabled,
     * unavailable, and outside-view; composes the ghost-button recipe for
     * hover.
     */
    RangeCalendarCellTrigger: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: [
                "h-[var(--vueda-cal-day)] w-[var(--vueda-cal-day)] p-0 font-normal data-[selected]:opacity-100",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground",
                "data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground",
                "data-[outside-view]:text-muted-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive data-[unavailable]:line-through",
            ],
        },
    },

    // ---------- Combobox ----------

    /**
     * Positioning anchor for the Combobox popover. Usually wraps the trigger
     * so the popover aligns to the input.
     */
    ComboboxAnchor: {
        root: {
            class: ["w-[200px]"],
        },
    },

    /**
     * The pressable surface that opens the Combobox popover. Combobox uses
     * the input shell (not the neutral chip Select uses) because the user is
     * about to type.
     */
    ComboboxTrigger: {
        root: {
            class: [""],
        },
    },

    /**
     * The floating popover surface that holds the Combobox results.
     */
    ComboboxList: {
        root: {
            class: [
                "z-50 w-[200px] rounded-vueda-control border bg-popover text-popover-foreground origin-(--reka-combobox-content-transform-origin) overflow-hidden shadow-vueda-popover outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            ],
        },
    },

    /**
     * Scrollable region inside ComboboxList that wraps the results.
     */
    ComboboxViewport: {
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },

    /**
     * Search field at the top of a Combobox popover. Sized to the large
     * control-height tier (`h-vueda-control-lg`) so it reads as the primary
     * surface inside the popover.
     */
    ComboboxInput: {
        root: {
            class: [
                "placeholder:text-muted-foreground flex h-vueda-control-lg w-full rounded-vueda-control bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },

    /**
     * Section of related items inside ComboboxList, optionally with a
     * heading. The heading slot renders the caps-mono-micro eyebrow recipe.
     */
    ComboboxGroup: {
        root: {
            class: ["overflow-hidden p-1 text-foreground"],
        },
        heading: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase",
        },
    },

    /**
     * Individual result row inside a Combobox. Highlighted by `--accent` when
     * focused; muted icon flips to `--accent-foreground` on highlight.
     */
    ComboboxItem: {
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },

    /**
     * Indicator (check mark, etc.) on a selected ComboboxItem.
     */
    ComboboxItemIndicator: {
        root: {
            class: ["ml-auto"],
        },
    },

    /**
     * 1px divider between sections inside a Combobox.
     */
    ComboboxSeparator: {
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },

    /**
     * Placeholder shown inside ComboboxList when the search has zero results.
     */
    ComboboxEmpty: {
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },

    // ---------- Command ----------

    /**
     * Command palette surface (a search + categorised result list). Often
     * hosted inside a CommandDialog; can also render inline. Uses card radius
     * (4px), not control radius (2px), because Command is a shell surface,
     * not a slab control.
     */
    Command: {
        root: {
            class: [
                "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-vueda-card",
            ],
        },
    },

    /**
     * Search field at the top of a Command. The wrapper slot adds the inset
     * icon and divider below the input.
     */
    CommandInput: {
        root: {
            class: [
                "placeholder:text-muted-foreground flex h-[var(--vueda-cmd-input-height)] w-full rounded-vueda-control bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        wrapper: { class: "flex h-[var(--vueda-cmd-input-height)] items-center gap-2 border-b px-3" },
    },

    /**
     * Scrollable region of Command holding the result groups.
     */
    CommandList: {
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },

    /**
     * Placeholder shown when the Command search has zero results.
     */
    CommandEmpty: {
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },

    /**
     * Section of related items inside CommandList, with a heading row.
     */
    CommandGroup: {
        root: {
            class: ["text-foreground overflow-hidden p-1"],
        },
        heading: {
            class: "px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
        },
    },

    /**
     * Individual result row inside a Command. Same highlight recipe as
     * ComboboxItem.
     */
    CommandItem: {
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },

    /**
     * 1px divider between sections inside Command.
     */
    CommandSeparator: {
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },

    /**
     * Inline keyboard-shortcut hint on the trailing edge of a CommandItem.
     */
    CommandShortcut: {
        root: {
            class: ["text-muted-foreground ml-auto text-xs tracking-widest"],
        },
    },

    /**
     * Optional chin below CommandList carrying keyboard-navigation hints (↑↓
     * navigate, ↵ select, Esc close) and custom action labels. Inline `<kbd>`
     * inside the footer drops to 18x18 / mono 10px so the chin trades
     * legibility for density.
     */
    CommandFooter: {
        root: {
            class: [
                "flex h-[var(--vueda-cmd-footer-height)] items-center justify-between gap-3 border-t bg-muted px-[var(--vueda-control-px-md)] text-[length:var(--vueda-text-supporting)] text-muted-foreground",
                "[&_kbd]:inline-flex [&_kbd]:h-[18px] [&_kbd]:min-w-[18px] [&_kbd]:items-center [&_kbd]:justify-center [&_kbd]:rounded-[2px] [&_kbd]:border [&_kbd]:bg-background [&_kbd]:px-1 [&_kbd]:font-mono [&_kbd]:text-[10px] [&_kbd]:font-medium [&_kbd]:text-foreground",
            ],
        },
        hints: { class: "inline-flex items-center gap-3" },
        hint: { class: "inline-flex items-center gap-1.5" },
    },

    /**
     * Dialog wrapper that hosts a Command at modal scale. The header is
     * `sr-only`; the content slot drops all padding so Command's own chrome
     * owns the geometry.
     */
    CommandDialog: {
        content: { class: "overflow-hidden p-0" },
        header: { class: "sr-only" },
    },

    // ---------- Select ----------

    /**
     * The pressable surface that opens a Select. Reads as a neutral chip (not
     * an input shell) to differentiate Select-the-enum-picker from
     * Combobox-the-searchable-picker.
     */
    SelectTrigger: {
        root: {
            class: [
                "data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 hover:hairline-border-strong hairline flex w-fit items-center justify-between gap-2 rounded-vueda-control bg-transparent px-vueda-control-px text-sm whitespace-nowrap shadow-vueda-control transition-shadow disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-vueda-control data-[size=sm]:h-vueda-control-sm data-[size=lg]:h-vueda-control-lg data-[size=lg]:px-vueda-control-px-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:hairline-ring focus-visible:focus-ring-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },

    /**
     * The floating popover surface that holds the Select options. `position`
     * picks between `popper` (anchored) and `item-aligned` (legacy aligned
     * with the selected item).
     */
    SelectContent: {
        root: ({ position }) => ({
            class: [
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-vueda-control border shadow-vueda-popover",
                {
                    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1":
                        position === "popper",
                },
            ],
        }),
        viewport: ({ position }) => ({
            class: [
                "p-1",
                {
                    "h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)] scroll-my-1":
                        position === "popper",
                },
            ],
        }),
    },

    /**
     * Individual option inside a SelectContent. The committed value tints
     * with `bg-primary/10`; the highlighted-but-not-committed option uses
     * `--accent`.
     */
    SelectItem: {
        root: {
            class: [
                "focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-primary/10 [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
            ],
        },
    },

    /**
     * Section heading inside SelectContent (caps, mono micro). Same eyebrow
     * recipe as ComboboxGroup.heading.
     */
    SelectLabel: {
        root: {
            class: [
                "text-muted-foreground px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em]",
            ],
        },
    },

    /**
     * 1px divider between sections inside SelectContent.
     */
    SelectSeparator: {
        root: {
            class: ["bg-border pointer-events-none -mx-1 my-1 h-px"],
        },
    },

    /**
     * Scroll-up affordance on long SelectContent lists.
     */
    SelectScrollUpButton: {
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },

    /**
     * Scroll-down affordance on long SelectContent lists.
     */
    SelectScrollDownButton: {
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },

    // ---------- Tags input ----------

    /**
     * Multi-value input that captures discrete entries (tags, emails,
     * keywords) as pill chips. The text input grows in the same shell as the
     * committed chips.
     */
    TagsInput: {
        root: {
            class: [
                "flex flex-wrap gap-2 items-center rounded-vueda-control hairline bg-background dark:bg-input/30 px-2 py-1 text-sm shadow-vueda-control transition-shadow",
                "has-[input:focus-visible]:hairline-ring [&:has(input:focus-visible):not(:has([data-state=active]))]:focus-ring-shadow",
                "aria-invalid:hairline-destructive [&[aria-invalid]:has(input:focus-visible):not(:has([data-state=active]))]:focus-ring-shadow-destructive",
            ],
        },
    },

    /**
     * The free-text entry field inside a TagsInput. Sized to the chip height
     * so committed and pending text share a baseline.
     */
    TagsInputInput: {
        root: {
            class: ["text-sm min-h-[var(--vueda-chip-height)] focus:outline-none flex-1 bg-transparent px-1"],
        },
    },

    /**
     * An individual committed chip inside a TagsInput. Pill radius marks it
     * as a user-manipulated tag/chip object (versus slab-radius system
     * badges).
     */
    TagsInputItem: {
        root: {
            class: [
                "flex h-[var(--vueda-chip-height)] items-center rounded-vueda-pill bg-secondary data-[state=active]:focus-ring",
            ],
        },
    },

    /**
     * The text label inside a TagsInputItem.
     */
    TagsInputItemText: {
        root: {
            class: ["py-0.5 px-2 text-sm rounded bg-transparent"],
        },
    },

    /**
     * The remove (x) button at the trailing edge of a TagsInputItem.
     */
    TagsInputItemDelete: {
        root: {
            class: ["flex rounded bg-transparent mr-1"],
        },
    },

    // ---------- Checkbox ----------

    /**
     * Standard boolean checkbox. 4px corner (one step softer than the 2px
     * control radius) so it reads as a chit rather than a miniature slab
     * control. Checked state fills with `--primary`; aria-invalid swaps the
     * fill and ring to destructive.
     */
    Checkbox: {
        root: {
            class: [
                "peer data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground hairline size-6 shrink-0 rounded-vueda-checkbox shadow-vueda-control transition-shadow disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
                "data-[state=checked]:[--vueda-hairline-color:transparent] data-[state=indeterminate]:[--vueda-hairline-color:transparent]",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive aria-invalid:data-[state=checked]:bg-destructive aria-invalid:data-[state=checked]:text-destructive-foreground aria-invalid:data-[state=indeterminate]:bg-destructive aria-invalid:data-[state=indeterminate]:text-destructive-foreground",
            ],
        },
        indicator: {
            class: ["grid place-content-center text-current transition-none"],
        },
    },

    // ---------- Radio group ----------

    /**
     * Layout shell for a vertical run of RadioGroupItems.
     */
    RadioGroup: {
        root: {
            class: ["grid gap-3"],
        },
    },

    /**
     * Individual radio button inside a RadioGroup. The `indicator` and `dot`
     * slots paint the SVG circle dot inside the ring.
     */
    RadioGroupItem: {
        root: {
            class: [
                "text-primary dark:bg-input/30 hairline aspect-square size-6 shrink-0 rounded-full shadow-vueda-control transition-shadow disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive aria-invalid:text-destructive",
            ],
        },
        indicator: {
            class: ["relative flex items-center justify-center"],
        },
        dot: {
            class: ["size-3 rounded-full bg-current"],
        },
    },

    // ---------- Switch ----------

    /**
     * Sliding boolean control. Tighter than the iOS-canonical size: 18px
     * track / 16px thumb. Checked state fills with `--primary`.
     */
    Switch: {
        root: {
            class: [
                "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-vueda-control transition-all disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        thumb: {
            class: [
                "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
            ],
        },
    },

    // ---------- Slider ----------

    /**
     * Continuous-value control with a track, range fill, and one or more
     * thumbs. Supports horizontal (default) and vertical orientation.
     */
    Slider: {
        root: {
            class: [
                "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
            ],
        },
        track: {
            class: [
                "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
            ],
        },
        range: {
            class: ["bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"],
        },
        thumb: {
            class: [
                "bg-white border-primary ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
            ],
        },
    },
};
