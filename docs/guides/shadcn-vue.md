---
title: shadcn-vue and VUEDA
status: draft
audience: implementor
type: explanation
---

# shadcn-vue and VUEDA

## Relationship

VUEDA's UI components are built on the same foundation as shadcn-vue: Reka UI headless primitives, Tailwind CSS utilities, and a neutral design token palette. shadcn-vue serves as the upstream reference for component behavior and visual design. VUEDA owns and maintains the source, written in JavaScript, with styling applied through `useTheme` class keys rather than hard-coded classes.

The intent is that VUEDA covers the full shadcn-vue component surface so implementing projects do not need to reach for `shadcn-vue add` at all.

## Component name mapping

VUEDA reorganizes shadcn-vue components across five namespaces. The table below lists the shadcn-vue name, the VUEDA equivalent, and its namespace.

| shadcn-vue       | VUEDA                 | Namespace  |
| ---------------- | --------------------- | ---------- |
| Alert            | FeedbackAlert         | feedback   |
| Alert Dialog     | ShellAlertDialog      | shell      |
| Badge            | DisplayBadge          | display    |
| Button           | ControlButton         | controls   |
| Button Group     | ControlButtonGroup    | controls   |
| Calendar         | ControlCalendar       | controls   |
| Checkbox         | ControlCheckbox       | controls   |
| Combobox         | ControlCombobox       | controls   |
| Date Field       | ControlDateField      | controls   |
| Date Range Field | ControlDateRangeField | controls   |
| Dialog           | ShellDialog           | shell      |
| Drawer           | ShellDrawer           | shell      |
| Input            | ControlInput          | controls   |
| Input Group      | ControlInputGroup     | controls   |
| Input OTP        | ControlInputOTP       | controls   |
| Kbd              | DisplayKbd            | display    |
| Label            | ShellLabel            | shell      |
| Native Select    | ControlNativeSelect   | controls   |
| Number Field     | ControlNumberField    | controls   |
| Pagination       | NavigationPagination  | navigation |
| Popover          | ShellPopover          | shell      |
| Progress         | FeedbackProgress      | feedback   |
| Radio Group      | ControlRadioGroup     | controls   |
| Range Calendar   | ControlRangeCalendar  | controls   |
| Resizable        | ShellResizable        | shell      |
| Scroll Area      | ShellScrollArea       | shell      |
| Select           | ControlSelect         | controls   |
| Separator        | ShellSeparator        | shell      |
| Sheet            | ShellSheet            | shell      |
| Sidebar          | NavigationSidebar     | navigation |
| Skeleton         | FeedbackSkeleton      | feedback   |
| Slider           | ControlSlider         | controls   |
| Sonner           | FeedbackToaster       | feedback   |
| Switch           | ControlSwitch         | controls   |
| Tabs             | ShellTabs             | shell      |
| Textarea         | ControlTextarea       | controls   |
| Time Field       | ControlTimeField      | controls   |
| Toggle           | ControlToggle         | controls   |
| Toggle Group     | ControlToggleGroup    | controls   |
| Tooltip          | ShellTooltip          | shell      |

**Not yet in VUEDA:** The following shadcn-vue components are planned but not yet implemented.

In progress or queued: Breadcrumb, Date Picker, Dropdown Menu, Navigation Menu, Tags Input, Data Table.

Deferred to a later milestone: Accordion, Aspect Ratio, Avatar, Card, Collapsible, Command, Context Menu, Hover Card, Menubar, Stepper, Table.

## Using shadcn-vue blocks as reference

shadcn-vue blocks (sidebar layouts, nav patterns, dashboard shells) are not directly installable into a VUEDA project via `shadcn-vue add`. The generated files reference shadcn-vue component names and paths that do not match VUEDA's.

Instead, use blocks as a starting point:

1. Browse the block on the shadcn-vue site to understand its structure.
2. Copy the relevant markup and logic into your project manually.
3. Substitute shadcn-vue component names with their VUEDA equivalents using the mapping table above.
4. Adjust import paths to point at `@vueda/controls`, `@vueda/shell`, `@vueda/navigation`, etc.

This takes a few minutes per block and produces code that is consistent with the rest of your project rather than a separate parallel dependency tree.

## `shadcn-vue add` is not supported

Running `pnpm dlx shadcn-vue@latest add` will:

- Install TypeScript files that need manual conversion if your project uses JavaScript.
- Create local copies of components that already exist in VUEDA under different names.
- Add a parallel dependency tree (`src/components/ui/`) that diverges from VUEDA over time.

If you do use `shadcn-vue add`, you are responsible for reconciling duplicates against the mapping table, converting TypeScript to JavaScript, and keeping the installed components in sync with VUEDA as both evolve independently.
