/**
 * @module theme/vueda-tailwind/shell
 * @description Tailwind CSS theme configuration for VUEDA Client shell primitives.
 */

export default {
    // ---------- Accordion ----------
    /**
     * Accordion provides the theme hooks for vertically stacked disclosure sections.
     */
    Accordion: {
        /**
         * The root hook for the accordion wrapper. It intentionally ships without chrome so callers can compose accordion groups inside Card, Item, or plain page sections; see DESIGN.md § Containers.
         */
        root: { class: "" },
    },
    /**
     * AccordionItem defines the bordered row wrapper for one disclosure section.
     */
    AccordionItem: {
        /**
         * The wrapper for one disclosure row. It paints the simple bottom divider and removes it from the final item, keeping accordion chrome owned by items rather than the root; see DESIGN.md § Containers.
         */
        root: {
            class: "border-b last:border-b-0",
        },
    },
    /**
     * AccordionContent styles the collapsible region revealed by an accordion trigger.
     */
    AccordionContent: {
        /**
         * The animated collapsible content region. It owns the open and closed height animations and applies body text sizing while leaving padding to {@api theme-key:AccordionContent.inner}.
         */
        root: {
            class: "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-body",
        },
        /**
         * The inner content inset for an accordion panel. It adds only bottom padding so content aligns with the trigger start while leaving the item divider visible.
         */
        inner: {
            class: "pt-0 pb-4",
        },
    },
    /**
     * AccordionTrigger styles the interactive header that opens and closes accordion content.
     */
    AccordionTrigger: {
        /**
         * The clickable accordion header. It uses the container typography rhythm from DESIGN.md § Containers, exposes a focus outline, and rotates direct SVG icons when the item is open.
         */
        root: {
            class: "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-body font-medium transition-all hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
        },
        /**
         * The text wrapper inside the trigger. It stays minimal so custom trigger content can define its own stacking or inline layout.
         */
        header: {
            class: "flex",
        },
        /**
         * The disclosure icon beside the trigger text. It is optically nudged down to align with the first text line and uses muted color until inherited state changes it; see DESIGN.md § Containers.
         */
        icon: {
            class: "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200",
        },
    },

    // ---------- Alert Dialog ----------
    /**
     * AlertDialogAction styles the primary action inside a blocking confirmation dialog.
     */
    AlertDialogAction: {
        /**
         * The primary confirmation button in an alert dialog. It composes the default Button recipe so blocking confirmations keep the same focus, height, and CTA treatment as regular primary actions.
         */
        root: {
            composes: ["_ButtonBase.root", "_ButtonDefault.root"],
            class: [],
        },
    },
    /**
     * AlertDialogCancel styles the secondary dismissal action inside an alert dialog.
     */
    AlertDialogCancel: {
        /**
         * The secondary dismissal button in an alert dialog. It composes the outline Button recipe and adds mobile spacing for stacked footer layouts.
         */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["mt-2 sm:mt-0"],
        },
    },
    /**
     * AlertDialogContent styles the modal surface and overlay for destructive or consequential confirmations.
     */
    AlertDialogContent: {
        /**
         * The centered alert dialog surface. It uses the modal radius, overlay shadow, fixed viewport centering, and entrance or exit motion expected for blocking confirmations; see DESIGN.md § 5.
         */
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-vueda-modal border p-6 shadow-vueda-overlay duration-200 sm:max-w-lg",
        },
        /**
         * The alert dialog backdrop. It fills the viewport with the shared overlay color and fades with the same open or closed state as the dialog surface.
         */
        overlay: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    /**
     * AlertDialogDescription styles supporting copy that explains the confirmation.
     */
    AlertDialogDescription: {
        /**
         * The supporting copy below an alert dialog title. It uses muted small text so consequence detail supports the title without competing with the action buttons.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    /**
     * AlertDialogFooter arranges alert dialog actions with mobile-first stacking.
     */
    AlertDialogFooter: {
        /**
         * The action row for an alert dialog. It stacks buttons in reverse order on narrow screens and aligns them to the end once horizontal space is available.
         */
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
    /**
     * AlertDialogHeader groups the title and description at the top of an alert dialog.
     */
    AlertDialogHeader: {
        /**
         * The title and description stack at the top of an alert dialog. It centers copy on narrow screens and switches to left alignment at the small breakpoint.
         */
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
    /**
     * AlertDialogTitle styles the heading for an alert dialog.
     */
    AlertDialogTitle: {
        /**
         * The primary heading for an alert dialog. It uses a compact semibold heading treatment sized for modal content, not page-level display text.
         */
        root: {
            class: "text-lg font-semibold",
        },
    },

    // ---------- Collapsible ----------
    /**
     * Collapsible provides the root theme hook for a generic disclosure region.
     */
    Collapsible: {
        /**
         * The root hook for generic collapsible state. It intentionally has no visual recipe because Collapsible is a logic primitive; see DESIGN.md § Containers.
         */
        root: { class: "" },
    },
    /**
     * CollapsibleContent styles the region controlled by a collapsible trigger.
     */
    CollapsibleContent: {
        /**
         * The region controlled by a CollapsibleTrigger. It ships empty so feature surfaces can decide whether the content behaves like inline reveal, row detail, or raw-debug disclosure.
         */
        root: { class: "" },
    },
    /**
     * CollapsibleTrigger styles the control that toggles a collapsible region.
     */
    CollapsibleTrigger: {
        /**
         * The trigger hook for a generic collapsible. It ships empty so callers can use links, rows, buttons, or custom controls without inheriting accordion chrome.
         */
        root: { class: "" },
    },

    // ---------- Card ----------
    /**
     * Card styles the basic framed surface used for panels and contained content.
     */
    Card: {
        /**
         * The framed card surface. It owns the card background, border, radius, vertical rhythm, and non-raised shadow contract; padding on the horizontal axis belongs to child slots per DESIGN.md § Containers.
         */
        root: {
            class: "bg-card text-card-foreground flex flex-col gap-6 rounded-vueda-card border py-6 shadow-vueda-card",
        },
    },
    /**
     * CardHeader lays out the leading card title area and optional action.
     */
    CardHeader: {
        /**
         * The leading card header grid. It creates title and description rows and switches to a two-column layout when {@api theme-key:CardAction.root} is present; see DESIGN.md § Containers.
         */
        root: {
            class: "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        },
    },
    /**
     * CardTitle styles the primary heading inside a card.
     */
    CardTitle: {
        /**
         * The primary title text inside a card header. It uses compact semibold type so card headings stay subordinate to page titles.
         */
        root: {
            class: "leading-none font-semibold",
        },
    },
    /**
     * CardDescription styles secondary explanatory text inside a card header.
     */
    CardDescription: {
        /**
         * The secondary card header copy. It uses muted body text for explanatory text below {@api theme-key:CardTitle.root}.
         */
        root: {
            class: "text-muted-foreground text-body",
        },
    },
    /**
     * CardAction positions an action control alongside card header text.
     */
    CardAction: {
        /**
         * The trailing card header action region. It parks in the top-right column and spans the title and description rows without adding wrapper layout logic; see DESIGN.md § Containers.
         */
        root: {
            class: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        },
    },
    /**
     * CardContent provides the default horizontal inset for card body content.
     */
    CardContent: {
        /**
         * The body content inset for a card. It provides the horizontal padding that Card itself omits so full-width header or footer borders can span cleanly.
         */
        root: {
            class: "px-6",
        },
    },
    /**
     * CardFooter arranges trailing card actions or metadata.
     */
    CardFooter: {
        /**
         * The trailing card footer row. It aligns footer content horizontally and adds top padding only when the footer also carries a top border.
         */
        root: {
            class: "flex items-center px-6 [.border-t]:pt-6",
        },
    },

    // ---------- Dialog ----------
    /**
     * DialogContent styles the centered modal surface and close affordance.
     */
    DialogContent: {
        /**
         * The centered dialog surface. It uses the modal surface recipe, fixed viewport centering, overlay shadow, and enter or exit animation for standard modal dialogs; see DESIGN.md § 5.
         */
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-vueda-modal border p-6 shadow-vueda-overlay duration-200 sm:max-w-lg",
        },
        /**
         * The close control inside the dialog surface. It stays low-emphasis until hover or focus and uses the shared ring color for keyboard focus.
         */
        close: {
            class: "data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none text-sm leading-none",
        },
    },
    /**
     * DialogDescription styles supporting text inside a dialog.
     */
    DialogDescription: {
        /**
         * The supporting copy below a dialog title. It uses muted small text so detail remains subordinate to the title and body content.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    /**
     * DialogFooter arranges dialog actions with responsive stacking.
     */
    DialogFooter: {
        /**
         * The action row for dialog footers. It stacks in reverse order on narrow screens and aligns trailing actions on wider screens.
         */
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
    /**
     * DialogHeader groups dialog title and description content.
     */
    DialogHeader: {
        /**
         * The title and description stack at the top of a dialog. It centers copy on narrow screens and switches to left alignment at the small breakpoint.
         */
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
    /**
     * DialogOverlay styles the backdrop behind dialog surfaces.
     */
    DialogOverlay: {
        /**
         * The dialog backdrop layer. It fills the viewport with the shared overlay token and fades with dialog state changes.
         */
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    /**
     * DialogScrollContent styles a modal surface that can scroll within an overlay.
     */
    DialogScrollContent: {
        /**
         * The scrollable dialog surface. It stays centered inside the scroll overlay while preserving the modal radius, border, and overlay shadow used by dialog surfaces.
         */
        root: {
            class: "relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-vueda-overlay duration-200 sm:rounded-vueda-modal md:w-full",
        },
        /**
         * The scrollable dialog overlay. It both paints the backdrop and provides a grid centering context with vertical overflow for tall modal content.
         */
        overlay: {
            class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        },
        /**
         * The close control for scrollable dialog content. It is positioned inside the modal surface and uses a secondary hover fill instead of changing layout.
         */
        close: {
            class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary",
        },
    },
    /**
     * DialogTitle styles the heading for a dialog.
     */
    DialogTitle: {
        /**
         * The primary heading for a dialog. It uses compact semibold type sized for modal content, not page-level display text.
         */
        root: {
            class: "text-lg leading-none font-semibold",
        },
    },

    // ---------- Field ----------
    /**
     * Field styles the outer wrapper for form field labels, controls, descriptions, and messages.
     */
    Field: {
        /**
         * The outer field layout wrapper. It switches between vertical, horizontal, responsive, and read-only grid layouts while carrying invalid state color; see DESIGN.md § Forms.
         */
        root: ({ orientation }) => {
            const base = "group/field flex w-full gap-3 data-[invalid=true]:text-destructive";
            if (orientation === "horizontal") {
                return {
                    class: [
                        base,
                        "flex-row items-start",
                        "[&>[data-slot=field-label]]:w-48 [&>[data-slot=field-label]]:shrink-0 [&>[data-slot=field-label]]:pt-2 [&>[data-slot=field-label]]:text-right [&>[data-slot=field-label]]:justify-end",
                        "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "responsive") {
                return {
                    class: [
                        base,
                        "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-start @md/field-group:[&>*]:w-auto",
                        "@md/field-group:[&>[data-slot=field-label]]:w-48 @md/field-group:[&>[data-slot=field-label]]:shrink-0 @md/field-group:[&>[data-slot=field-label]]:pt-2 @md/field-group:[&>[data-slot=field-label]]:text-right @md/field-group:[&>[data-slot=field-label]]:justify-end",
                        "@md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "read") {
                return {
                    class: [
                        "group/field grid w-full grid-cols-[180px_1fr] items-start gap-x-5 gap-y-2 py-2 border-b border-border data-[invalid=true]:text-destructive",
                        "[&>[data-slot=field-label]]:text-[12px] [&>[data-slot=field-label]]:font-medium [&>[data-slot=field-label]]:leading-[1.5] [&>[data-slot=field-label]]:text-muted-foreground [&>[data-slot=field-label]]:pt-px",
                    ],
                };
            }
            // vertical (default)
            return {
                class: [base, "flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
            };
        },
    },
    /**
     * FieldContent groups the non-label content inside a field.
     */
    FieldContent: {
        /**
         * The non-label content stack inside a field. It groups controls, helper text, and validation messages into a compact flex column.
         */
        root: {
            class: "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        },
    },
    /**
     * FieldDescription styles helper text and explanatory links for a field.
     */
    FieldDescription: {
        /**
         * The helper text beneath or beside a field control. It uses supporting text size, muted color, and link styling that keeps explanatory copy readable without becoming the primary label.
         */
        root: {
            class: [
                "text-muted-foreground text-[length:var(--vueda-text-supporting)] leading-[1.4] font-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
                "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
    /**
     * FieldGroup stacks related fields and nested field groups.
     */
    FieldGroup: {
        /**
         * The stack for related fields and nested field groups. It establishes the field-group container query used by responsive fields and tightens spacing for checkbox and radio groups.
         */
        root: {
            class: "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        },
    },
    /**
     * FieldLabel styles the label text and optional control-card wrapper for a field.
     */
    FieldLabel: {
        /**
         * The label text or label-card wrapper for a field. It handles disabled opacity, nested control-card framing, and checked-state tint for label-wrapped choices; see DESIGN.md § Forms.
         */
        root: {
            class: [
                "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
                "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
                "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
            ],
        },
    },
    /**
     * FieldLegend styles grouped-field headings used as legends or label-like text.
     */
    FieldLegend: {
        /**
         * The legend or label-style heading for grouped fields. Its variant attribute chooses between larger legend text and compact label text.
         */
        root: {
            class: "mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm",
        },
    },
    /**
     * FieldMessage styles validation or warning feedback attached to a field.
     */
    FieldMessage: {
        /**
         * The validation or warning message attached to a field. It maps error severity to destructive text and all other severities to warning text, matching the form feedback contract in DESIGN.md § Forms.
         */
        root: ({ severity }) => ({
            class: [
                "text-[length:var(--vueda-text-supporting)] leading-[1.4] font-medium",
                severity === "error" ? "text-destructive" : "text-warning",
            ],
        }),
        /**
         * The list wrapper for multiple field messages. It keeps grouped validation details compact and indented under the field message block.
         */
        list: {
            class: "ml-4 flex list-disc flex-col gap-1",
        },
    },
    /**
     * FieldSeparator creates a labeled divider between field groups.
     */
    FieldSeparator: {
        /**
         * The positioned wrapper for a labelled field divider. It reserves the line height and variant-specific vertical offset used inside field groups.
         */
        root: {
            class: "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        },
        /**
         * The horizontal rule behind a field separator label. It fills the separator wrapper and aligns through the vertical center.
         */
        line: {
            class: "absolute inset-0 top-1/2",
        },
        /**
         * The label content laid over the separator line. It uses the page background as a mask so the text remains readable over the rule.
         */
        content: {
            class: "bg-background text-muted-foreground relative mx-auto block w-fit px-2",
        },
    },
    /**
     * FieldSet stacks related fields inside a fieldset.
     */
    FieldSet: {
        /**
         * The stack for a fieldset's child fields. It uses the default field rhythm and tightens spacing when the direct child is a checkbox or radio group.
         */
        root: {
            class: [
                "flex flex-col gap-6",
                "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
            ],
        },
    },
    /**
     * FieldTitle styles compact field-adjacent heading text.
     */
    FieldTitle: {
        /**
         * The compact title text adjacent to field content. It follows field disabled opacity and uses label-weight type for local field headings.
         */
        root: {
            class: "flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50",
        },
    },

    // ---------- Hover Card ----------
    /**
     * HoverCardTrigger provides the theme hook for the element that opens hover card content.
     */
    HoverCardTrigger: {
        /**
         * The trigger hook for hover-card content. It ships empty so the trigger can inherit the semantics and visual treatment of the element that owns the hover affordance.
         */
        root: { class: "" },
    },
    /**
     * HoverCardContent styles contextual content displayed from a hover trigger.
     */
    HoverCardContent: {
        /**
         * The floating hover-card panel. It uses the popover surface recipe at a tighter width for glance-weight summaries; see DESIGN.md § Overlays / menus and § Feedback / loading.
         */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 rounded-vueda-control border p-4 shadow-vueda-popover outline-hidden",
        },
    },

    // ---------- Item ----------
    /**
     * Item styles a reusable row-like content block with variants for plain, muted, and outlined contexts.
     */
    Item: {
        /**
         * The row-like item wrapper. It carries the default, outline, and muted variants, size spacing, anchor hover behavior, and focus treatment described in DESIGN.md § Containers.
         */
        root: ({ variant, size }) => {
            const variantClass =
                variant === "outline" ? "border-border" : variant === "muted" ? "bg-muted/50" : "bg-transparent";
            const sizeClass = size === "sm" ? "py-3 px-4 gap-2.5" : "p-4 gap-4";
            return {
                class: [
                    "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    variantClass,
                    sizeClass,
                ],
            };
        },
    },
    /**
     * ItemActions arranges trailing controls for an item.
     */
    ItemActions: {
        /**
         * The trailing action group inside an item. It keeps adjacent controls aligned and evenly spaced without affecting the main content column.
         */
        root: {
            class: "flex items-center gap-2",
        },
    },
    /**
     * ItemContent stacks the main text content inside an item.
     */
    ItemContent: {
        /**
         * The main text stack inside an item. It flexes to fill available space and lets a following content block opt out of that growth.
         */
        root: {
            class: "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        },
    },
    /**
     * ItemDescription styles secondary text and links inside an item.
     */
    ItemDescription: {
        /**
         * The secondary item copy. It clamps to two lines, uses muted body text, and styles links as quiet inline affordances.
         */
        root: {
            class: [
                "text-muted-foreground line-clamp-2 text-body leading-normal font-normal text-balance",
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
    /**
     * ItemFooter styles low-emphasis footer metadata inside an item.
     */
    ItemFooter: {
        /**
         * The low-emphasis metadata row below item content. It uses compact mono supporting text so timestamps, counters, and machine-generated values read as metadata; see DESIGN.md § 3.2.
         */
        root: {
            class: "flex basis-full items-center justify-between gap-2 font-mono text-[length:var(--vueda-text-supporting)] text-muted-foreground",
        },
    },
    /**
     * ItemGroup stacks related item rows.
     */
    ItemGroup: {
        /**
         * The stack wrapper for related items. It opens a named group scope and leaves borders or section chrome to the caller.
         */
        root: {
            class: "group/item-group flex flex-col",
        },
    },
    /**
     * ItemHeader styles low-emphasis header metadata inside an item.
     */
    ItemHeader: {
        /**
         * The low-emphasis metadata row above item content. It mirrors {@api theme-key:ItemFooter.root} for compact mono metadata before the title.
         */
        root: {
            class: "flex basis-full items-center justify-between gap-2 font-mono text-[length:var(--vueda-text-supporting)] text-muted-foreground",
        },
    },
    /**
     * ItemMedia styles leading icon, image, or media regions inside an item.
     */
    ItemMedia: {
        /**
         * The leading media region for an item. The `icon` variant creates a 32px bordered tile, the `image` variant creates a 40px cropped image frame, and the default stays transparent; see DESIGN.md § Containers.
         */
        root: ({ variant }) => {
            const variantClass =
                variant === "icon"
                    ? "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4"
                    : variant === "image"
                      ? "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover"
                      : "bg-transparent";
            return {
                class: [
                    "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
                    variantClass,
                ],
            };
        },
    },
    /**
     * ItemSeparator styles dividers between item rows.
     */
    ItemSeparator: {
        /**
         * The divider between item rows. It removes extra vertical margin so separators can be used in dense item groups.
         */
        root: {
            class: "my-0",
        },
    },
    /**
     * ItemTitle styles the primary label inside an item.
     */
    ItemTitle: {
        /**
         * The primary label inside an item. It uses body-sized medium text and inline gap support for leading or trailing inline elements.
         */
        root: {
            class: "flex w-fit items-center gap-2 text-body leading-snug font-medium",
        },
    },

    // ---------- Label ----------
    /**
     * Label styles accessible label text associated with form controls and grouped inputs.
     */
    Label: {
        /**
         * The accessible label text for controls and grouped inputs. It handles disabled states from both group and peer contexts while preserving compact inline alignment.
         */
        root: {
            class: "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        },
    },

    // ---------- Popover ----------
    /**
     * PopoverContent styles positioned floating content opened by a popover trigger.
     */
    PopoverContent: {
        /**
         * The positioned popover panel. It uses the shared floating surface recipe and size-driven width and padding tiers from DESIGN.md § Overlays / menus.
         */
        root: ({ size }) => {
            const sizeClass = size === "sm" ? "w-60 p-3" : size === "lg" ? "w-90 p-5" : "w-72 p-4";
            return {
                class: [
                    "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-vueda-control border shadow-vueda-popover origin-(--reka-popover-content-transform-origin) outline-hidden",
                    sizeClass,
                ],
            };
        },
    },

    // ---------- Resizable ----------
    /**
     * ResizableHandle styles the draggable separator between resizable panels.
     */
    ResizableHandle: {
        /**
         * The draggable divider between resizable panels. It expands the hit area around the 1px visual rule and adapts the affordance for horizontal or vertical panel groups.
         */
        root: {
            class: "bg-border relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
        },
        /**
         * The visible grip inside a resizable handle. It gives pointer users a small bordered target without changing the panel separator's actual layout width.
         */
        handle: {
            class: "bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border",
        },
    },
    /**
     * ResizablePanelGroup styles the flex container that holds resizable panels.
     */
    ResizablePanelGroup: {
        /**
         * The flex container for resizable panels. It switches from row to column layout when the panel group orientation is vertical.
         */
        root: {
            class: "flex h-full w-full data-[orientation=vertical]:flex-col",
        },
    },

    // ---------- Scroll Area ----------
    /**
     * ScrollArea styles custom scroll containers and their focusable viewport.
     */
    ScrollArea: {
        /**
         * The root wrapper for a custom scroll area. It establishes relative positioning for scrollbars without adding surface chrome.
         */
        root: {
            class: "relative",
        },
        /**
         * The focusable viewport inside a scroll area. It inherits the parent radius and exposes a keyboard focus outline around the scrolling region.
         */
        viewport: {
            class: "size-full rounded-[inherit] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
    /**
     * ScrollBar styles the scrollbar track and thumb for scroll areas.
     */
    ScrollBar: {
        /**
         * The custom scrollbar track. It uses a 10px touch target and switches its border side and dimensions by orientation; see DESIGN.md § Containers.
         */
        root: ({ orientation }) => ({
            class: [
                "flex touch-none p-px transition-colors select-none",
                orientation === "horizontal"
                    ? "h-2.5 flex-col border-t border-t-transparent"
                    : "h-full w-2.5 border-l border-l-transparent",
            ],
        }),
        /**
         * The draggable scrollbar thumb. It uses the border token as a quiet neutral fill and rounds fully inside the track.
         */
        thumb: {
            class: "bg-border relative flex-1 rounded-full",
        },
    },

    // ---------- Separator ----------
    /**
     * Separator styles horizontal and vertical rules used to divide content.
     */
    Separator: {
        /**
         * The plain horizontal or vertical dividing rule. It is a single border-token line with no label or inset variant, matching DESIGN.md § Containers.
         */
        root: {
            class: "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        },
    },

    // ---------- Drawer ----------
    /**
     * DrawerContent styles edge-attached drawer surfaces and their optional handle.
     */
    DrawerContent: {
        /**
         * The edge-attached drawer surface. It reads Vaul direction attributes to choose edge, size, max height, and which modal-radius corners stay rounded.
         */
        root: {
            class: "group/drawer-content bg-background fixed z-50 flex h-auto flex-col data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-vueda-modal data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-vueda-modal data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-sm data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-sm",
        },
        /**
         * The drag handle shown for bottom drawers. It stays hidden for other drawer directions where the edge affordance would be misleading.
         */
        handle: {
            class: "bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block",
        },
    },
    /**
     * DrawerDescription styles supporting text inside a drawer.
     */
    DrawerDescription: {
        /**
         * The supporting copy inside a drawer. It uses muted small text to stay subordinate to the drawer title and body content.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    /**
     * DrawerFooter arranges trailing drawer actions.
     */
    DrawerFooter: {
        /**
         * The trailing action area inside a drawer. It pins itself after drawer body content and stacks actions with the standard 4px-grid gap.
         */
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
    /**
     * DrawerHeader groups drawer title and description content.
     */
    DrawerHeader: {
        /**
         * The title and description stack inside a drawer. It applies the drawer's default 16px inset and compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
    /**
     * DrawerOverlay styles the backdrop behind drawer surfaces.
     */
    DrawerOverlay: {
        /**
         * The drawer backdrop layer. It fills the viewport with the shared overlay token and fades with drawer state changes.
         */
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    /**
     * DrawerTitle styles the heading for a drawer.
     */
    DrawerTitle: {
        /**
         * The primary heading inside a drawer. It uses foreground semibold text without page-title scaling.
         */
        root: {
            class: "text-foreground font-semibold",
        },
    },

    // ---------- Sheet ----------
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
            class: "data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none text-sm leading-none",
        },
    },
    /**
     * SheetDescription styles supporting text inside a sheet.
     */
    SheetDescription: {
        /**
         * The supporting copy inside a sheet. It uses muted small text to stay subordinate to the sheet title and body content.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    /**
     * SheetFooter arranges trailing sheet actions.
     */
    SheetFooter: {
        /**
         * The trailing action area inside a sheet. It sits after the body content and stacks actions with the standard inset.
         */
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
    /**
     * SheetHeader groups sheet title and description content.
     */
    SheetHeader: {
        /**
         * The title and description stack inside a sheet. It applies the sheet's default 16px inset and compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
    /**
     * SheetOverlay styles the backdrop behind sheet surfaces.
     */
    SheetOverlay: {
        /**
         * The sheet backdrop layer. It fills the viewport with the shared overlay token and fades with sheet state changes.
         */
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    /**
     * SheetTitle styles the heading for a sheet.
     */
    SheetTitle: {
        /**
         * The primary heading inside a sheet. It uses foreground semibold text without page-title scaling.
         */
        root: {
            class: "text-foreground font-semibold",
        },
    },

    // ---------- Stepper ----------
    /**
     * Stepper styles the container for sequenced progress or workflow steps.
     */
    Stepper: {
        /**
         * The root flex row for a stepper. It provides only the step gap so orientation and step semantics stay with the composed step items.
         */
        root: {
            class: "flex gap-2",
        },
    },
    /**
     * StepperItem styles an individual step and its connector context.
     */
    StepperItem: {
        /**
         * The wrapper for one step and its connector context. It opens the state group used by indicator and separator slots and suppresses pointer events when disabled.
         */
        root: {
            class: "flex items-center gap-2 group data-[disabled]:pointer-events-none",
        },
    },
    /**
     * StepperTrigger styles the interactive control for selecting a step.
     */
    StepperTrigger: {
        /**
         * The selectable control for a step. It stacks indicator and label content in a compact centered column with a modest focusable radius.
         */
        root: {
            class: "p-1 flex flex-col items-center text-center gap-1 rounded-md",
        },
    },
    /**
     * StepperIndicator styles the circular marker that communicates step state.
     */
    StepperIndicator: {
        /**
         * The circular step marker. It maps active, completed, disabled, and upcoming states to the stepper color contract described in DESIGN.md § Containers.
         */
        root: {
            class: [
                "inline-flex items-center justify-center rounded-full text-muted-foreground/50 w-8 h-8",
                "group-data-[disabled]:text-muted-foreground group-data-[disabled]:opacity-50",
                "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
                "group-data-[state=completed]:bg-accent group-data-[state=completed]:text-accent-foreground",
            ],
        },
    },
    /**
     * StepperTitle styles the label for a step.
     */
    StepperTitle: {
        /**
         * The primary label for a step. It stays on one line so horizontal steppers do not shift as labels wrap.
         */
        root: {
            class: "text-md font-semibold whitespace-nowrap",
        },
    },
    /**
     * StepperDescription styles supporting text beneath a step title.
     */
    StepperDescription: {
        /**
         * The supporting text beneath a step title. It uses muted extra-small text for optional detail below the primary label.
         */
        root: {
            class: "text-xs text-muted-foreground",
        },
    },
    /**
     * StepperSeparator styles the connector line between steps.
     */
    StepperSeparator: {
        /**
         * The connector line between steps. It stays muted for upcoming or disabled steps and switches to accent after completion.
         */
        root: {
            class: [
                "flex-1 h-0.5 min-w-6 rounded-sm mt-4 transition-colors",
                "bg-muted",
                "group-data-[disabled]:bg-muted group-data-[disabled]:opacity-50",
                "group-data-[state=completed]:bg-accent",
            ],
        },
    },

    // ---------- Tabs ----------
    /**
     * Tabs styles the root layout for tabbed content.
     */
    Tabs: {
        /**
         * The root stack for tabbed content. It keeps the tab list and active panel separated by a compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-2",
        },
    },
    /**
     * TabsContent styles the active panel area in a tabs set.
     */
    TabsContent: {
        /**
         * The active tab panel. It flexes to fill remaining space and removes default outline chrome so focus treatment can be handled by child content when needed.
         */
        root: {
            class: "flex-1 outline-none",
        },
    },
    /**
     * TabsList styles the segmented control that contains tab triggers.
     */
    TabsList: {
        /**
         * The segmented tab-list surface. It uses muted fill, compact height, and a small internal padding so active triggers read as selected slabs.
         */
        root: {
            class: "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        },
    },
    /**
     * TabsTrigger styles each selectable tab in a tabs list.
     */
    TabsTrigger: {
        /**
         * The selectable tab segment. It handles active fill, dark-mode contrast, icon sizing, disabled state, and keyboard focus while staying within the segmented list surface.
         */
        root: {
            class: "data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-vueda-control border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },

    // ---------- Tooltip ----------
    /**
     * TooltipContent styles compact floating help text and its arrow.
     */
    TooltipContent: {
        /**
         * The compact floating tooltip panel. It inverts foreground and background tokens, uses control radius, and follows the tooltip surface rule in DESIGN.md § Overlays / menus.
         */
        root: {
            class: "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-vueda-control px-3 py-1.5 text-xs font-medium text-balance",
        },
        /**
         * The tooltip arrow. It is a small rotated square that inherits the tooltip surface color and sits behind the panel edge.
         */
        arrow: {
            class: "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]",
        },
    },

    // ---------- Sticky Bar ----------
    /**
     * StickyBar styles a persistent action bar that can hide or reveal while staying anchored.
     */
    StickyBar: {
        /**
         * The sticky action-bar wrapper. It stays anchored just above the page edge and translates out of view when `hidden` is true.
         */
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
        /**
         * The visible sticky-bar surface. It uses card fill, a bottom divider, and wrapping row layout for primary and secondary controls.
         */
        inner: {
            class: ["bg-card border-b border-border px-5 py-[10px] flex items-center flex-wrap gap-2"],
        },
        /**
         * The primary control cluster inside the sticky bar. It wraps compact action buttons and pushes secondary content to the far side.
         */
        primary: {
            class: ["flex flex-wrap gap-1.5 mr-auto"],
        },
        /**
         * The secondary control cluster inside the sticky bar. It keeps trailing controls aligned while allowing them to wrap on narrow widths.
         */
        secondary: {
            class: ["flex flex-wrap gap-1.5 items-center"],
        },
        /**
         * The dirty-state badge inside the sticky bar. It uses primary tint, uppercase micro text, and pill radius to read as transient state rather than a command.
         */
        dirty: {
            class: [
                "inline-flex items-center justify-center",
                "h-[22px] px-2 rounded-full",
                "bg-primary/[0.12] text-primary",
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
            ],
        },
        /**
         * The fade below the sticky bar. It protects content immediately under the fixed chrome without adding a separate card surface.
         */
        gradient: {
            class: ["w-full h-3", "bg-gradient-to-b from-card to-transparent"],
        },
    },
};
