---
title: Components
status: brainstorming
audience: designer
type: index
---

# Components

These pages show the {@term Visual Contract} of each component in the default
theme: its variants, sizes, and states. Each page links the theme keys and
tokens that set its current values.
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md) gives
the steps for overriding them.

The rules below apply to every component page. A re-skin changes the
{@term Skin} and keeps each demo readable as the same control. A change that
breaks a demo changes the design language. Values such as colors, sizes, and
durations live in [theme tokens]{@term Theme Token}, and class compositions and
state recipes live in [theme keys]{@term Theme Key}.

Buttons, toggles, single-line inputs, select triggers, date and time fields, and
pagination items share one control height scale:
{@api css-token:vueda-control-height} and its
[`-sm`]{@api css-token:vueda-control-height-sm} and
[`-lg`]{@api css-token:vueda-control-height-lg} steps. Other controls, such as
switches, checkboxes, and navigation menu triggers, set their own sizes. Focus
rings take their width and offset from {@api css-token:vueda-focus-ring-width}
and {@api css-token:vueda-focus-ring-offset}. The Switch track draws its own
outline.

## Controls

- [Buttons](/reference/components/buttons)
- [Forms](/reference/components/forms)
- [Inputs](/reference/components/inputs)
- [Form Widgets](/reference/components/widgets)
- [Selection + Command](/reference/components/selection-and-command)
- [Date + Time](/reference/components/datetime)
- [Feedback + Loading](/reference/components/feedback-and-loading)
- [Overlays](/reference/components/overlays)

## Navigation

- [Navigation](/reference/components/navigation)
- [Pagination](/reference/components/pagination)

## Shell

- [Containers](/reference/components/containers)
- [Sidebar](/reference/components/sidebar)
- [Sticky Chrome](/reference/components/sticky-chrome)

## Grid

- [ObjectsGrid](/reference/components/objectsgrid)
- [Tables](/reference/components/tables)

## Views

- [CRUD Views](/reference/components/views-crud)
- [Action & Workflow Views](/reference/components/action-workflow)
- [System Views](/reference/components/system-views)
- [Auth & MFA Views](/reference/components/auth-and-mfa)
