---
name: vueda-mockups
description: Make static HTML mockups of VUEDA application screens that look like VUEDA's default theme, without running VUEDA. Use for mockups, wireframes, and design reviews of list, read, create, update, and delete views for an application's own models and fields. Not for building or changing the application itself.
---

# VUEDA Mockups

This folder holds static HTML copies of VUEDA's generated views, rendered
from the real components in the default theme. Build a mockup by copying a
view and replacing its fields with the application's fields. The result looks
like what VUEDA renders for those fields, so a reviewer judges a realistic
screen.

A mockup is a picture of a screen. It does not run VUEDA, so menus stay closed
and buttons do nothing. It also cannot show which actions a user may take,
because the server decides that, not the page.

## What the folder contains

Paths are relative to this `SKILL.md`.

| Path                       | Contents                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `page.html`                | An empty page with the fonts, the stylesheet, and the body classes. Start every mockup from it. |
| `snapshots/catalog.md`     | What each snapshot shows, and every field in it with its types and widget. Read this first.     |
| `snapshots/view-*.html`    | Complete views of an example Customer model: list, read, create, update, and delete.            |
| `snapshots/fields-*.html`  | One field of each remaining type, as a list cell, a read-only value, and a form widget.         |
| `assets/vueda-mockups.css` | The compiled theme stylesheet. Link or inline it; do not read it.                               |
| `gallery.html`             | Every snapshot on one page, for people. Do not read it.                                         |

The snapshots are HTML fragments, not pages. Each one is the content of a
view, starting with the page title row.

## Build a mockup

1. List the screens and the fields that each one shows. For each field, find
   its serializer type and model type. Read them from the application's
   Django serializers and models when they exist. Otherwise, infer them from
   the description, and state your assumptions in your reply.
2. Read `snapshots/catalog.md`, and choose the view snapshot for each screen.
   A list uses `view-list-table.html` on a wide screen and
   `view-list-cards.html` below 1024 px. One record uses `view-read.html`,
   `view-create.html`, `view-update.html`, or `view-destroy.html`.
3. Copy `page.html` to the mockup's location. Paste the view snapshot into
   `<main>`. Fix the stylesheet link if the mockup is not beside `page.html`.
4. Replace the example fields, as described in the next section.
5. Replace the remaining example text. That includes the page title (such as
   "List Customers") and the record name heading. It also includes the model
   name on buttons and in the delete text, and the sample values.
6. Open the page in a browser to check it, if you can. Check a card-layout
   mockup in a window narrower than 1024 px, because the theme's layout rules
   follow the window width.

## Replace fields

Every field element carries `data-field` with the field's name. In forms and
read views, that is the `data-slot="field"` element that holds the label and
the widget. In lists, each cell carries `data-field`, and each column header
carries `data-header` (`data-card-header` in the card layout).

For each field of the application:

1. In the catalog, find an example field with the same serializer type and
   model type. Prefer one with the same notes, such as `choices` or `many`.
2. Copy that field's element from the snapshot that the catalog names. The
   Customer fields are in the `view-*` files. The other fields are in the
   `fields-*` file for the same kind of view.
3. Change the copy's `data-field`, the label text, the `name` attributes, and
   the shown value. Keep the classes and the structure.
4. Remove the example fields that the screen does not show.

When no example field matches, use the closest type and say so in your reply.
A text-like serializer field without choices uses the text input; one with
choices uses the select dropdown. A relation to another model renders the
same combobox as a many-valued choice field. A single relation uses that
combobox with one value.

Field order follows the order that the application lists its fields in. Use
each field name exactly as the application's serializer sends it.

## Keep it VUEDA

A mockup should show what VUEDA can render with configuration. Keep these
rules:

- Keep the classes on copied elements. Classes that start with `vk-` are short
  names for the theme's own class lists. Do not edit them or invent new ones.
- Style new layout only with classes that already appear in the snapshots, or
  that `assets/vueda-mockups.css` defines. The stylesheet holds only the
  classes that VUEDA uses. A Tailwind class that it lacks has no effect. Search
  the stylesheet for a class with a tool such as `grep`; do not read the file.
- Do not add colors, shadows, gradients, rounded cards, or new fonts. The
  theme is dense and nearly monochrome, with one blue accent.
- Changes that VUEDA supports through configuration need no warning. These
  include which fields a view shows, their order, labels, and read-only
  fields.
- Anything else needs custom code in the application. Mark it on the mockup
  as custom, and list it in your reply, so that reviewers can see the cost.
- Use made-up data. Do not copy real names, email addresses, or other
  personal data into a mockup. Use `example.com` for email addresses.

## Theme and delivery

For the dark theme, add `class="dark"` to the `<html>` element.

The page loads IBM Plex Sans and JetBrains Mono from Google Fonts, so it needs
a network connection to show the right fonts.

When the mockup must be one file, replace the stylesheet `<link>` with a
`<style>` element that contains the stylesheet. Copy the file's content with a
command; do not read it. The file is about 290 KB.

Some snapshots include a `<style>` element at the top. It holds styles that a
component adds while it runs, such as the JSON editor's. Keep it when you copy
that component.

## Known differences

The snapshots show VUEDA's current output, including these defects:

- The many-valued choice field (`regions`) shows a lone comma instead of the
  selected labels. Type the intended labels into the trigger text.
- The date-and-time field (`publishedAt`) in `fields-update.html` shows empty
  date and time segments. Fill in the intended value, following the date
  field (`releaseDate`) above it.
- The list's row checkboxes carry leftover attributes, such as `rowindex` and
  `pkkey`. They have no effect on the page; you can delete them.
