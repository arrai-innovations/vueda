---
title: Client
type: reference
audience: integrator
status: draft
---

# Client Changelog

Integrator-facing changes for the `@arrai-innovations/vueda` npm package.

Use this page for changes that affect client package consumers: public Vue components, composables, routes, stores, theme behavior, build integration, dependency expectations, and migration notes.

<!-- towncrier release notes start -->

## v3.0.0-beta.2 (2026-11-12)

### Breaking Changes

#### Lists and querying

- **`ViewList` `displayFields`, `fieldDetails`, and `fetchFields` props** ([#671](https://github.com/arrai-innovations/vueda/issues/671)):
    - The `displayFields` prop takes a list of field names, the same shape as the model config's `displayFields`, and the new `fieldDetails` prop takes overrides by field name. Each column and sort label is built from the field's model info with the `fieldDetails` entry on top, so a column from the prop renders the same way as one from the model config. The `fetchFields` prop replaces `listFields`.
      _Replace an object passed to `displayFields` with its keys, and move each entry's keys into `fieldDetails` under the same name. Rename `listFields` to `fetchFields`. A list shell that calls `useViewList` directly makes the same changes to its `displayFields` and `listFields` options._

#### Forms and validation

- **Action confirmation views laid out as pages** ([#578](https://github.com/arrai-innovations/vueda/issues/578)):
    - `ViewAction`, `ViewExecuteTransition`, `ViewActivate`, `ViewDeactivate`, and `ViewDestroy` now place the confirm button in the sticky action bar under the page title and their content in the page gutter, as `ViewRead` and `ViewUpdate` do, and the confirm button names the action instead of reading "Yes, continue". `ActionForm` and `ModelActionForm` gain a `page` prop for this layout, and selected-record chips show formatted names without primary keys.
      _Overrides of the removed `ViewDestroy.card` and `ViewDestroy.body` theme keys no longer apply; restyle the destroy page through the `ModelActionForm` and `ActionForm` keys instead._
- **Action views send extra actions to their routed URL with a method that the action accepts** ([#635](https://github.com/arrai-innovations/vueda/issues/635)):
    - `ModelActionForm` and the action views built on it send an extra action to the `urlPath` that model info reports, with a write method that the action's `methodNames` lists. The form sends `PUT` when `methodNames` lists it and otherwise the first listed write method, and the `requestMethod` prop chooses another listed method in place of that default. When the action has no such method, `ModelActionForm`, `ViewAction`, `ViewDestroy`, `ViewActivate`, and `ViewDeactivate` disable the confirm button, tell the user that only viewing is permitted, and send no request.
      _A host that renders `ModelActionForm` for an endpoint missing from model info, such as a route without `@action`, must pass `run-action` to send the request._

#### Field types

- **Read-only `SlugRelatedField` fields show their choice label** ([#585](https://github.com/arrai-innovations/vueda/issues/585)):
    - The `SlugRelatedField` type mapping now names the new `WidgetModelReadOnly` as its read-only widget. It reads the label from the field choices endpoint, the same source as the edit options of `WidgetModel`, so the related model needs no viewset and a slug value shows its label. The value is shown as text, not as a link to the related record.
      _A `widget-read-only(<name>)link-item` slot override on such a field no longer renders; move it to the `text-item` slot._
- **`WidgetReadOnly` renders its prefix and suffix around a `link-item` or `text-item` slot override** ([#652](https://github.com/arrai-innovations/vueda/issues/652)):
    - A `link-item` override now replaces only each linked label, and a `text-item` override replaces only the plain-text value. The widget's `prefix` and `suffix` props render around the override, as they render around the default content.
      _A project whose `link-item` or `text-item` override renders its own prefix or suffix must remove that text, or stop passing the `prefix` and `suffix` props._

#### Model metadata and data loading

- **Action URLs use the action segment as given** ([#635](https://github.com/arrai-innovations/vueda/issues/635)):
    - `getDetailUrl`, `getListUrl`, and the CRUD adapters put `action` into the URL as given, so dashes no longer become underscores. `getServerActionName` is removed. `defaultObjectExecuteAction` and `defaultListExecuteAction` take an optional `urlPath` for the URL segment, which defaults to `action`.
      _Pass the routed segment as `action`, such as `mark_paid`. For an extra action, that segment is the `urlPath` that model info reports for it. Remove imports of `getServerActionName`._

#### Routing and navigation

- **Project views in `src/views` replace VUEDA's views** ([#658](https://github.com/arrai-innovations/vueda/issues/658)):
    - Each built-in action, such as `list`, now renders the project's `@/views/View<Name><App><Model>.vue`, then `@/views/View<Name>.vue`, before VUEDA's view, and a custom action or transition without its own view renders `@/views/ViewAction.vue` or `@/views/ViewExecuteTransition.vue` first. `vuedaViteConfig` now sets the `@` alias to the project's `src` directory, and a project's own `@` in `extraAliases` replaces it. [View Component Resolution Order](../../core-concepts/routing-and-view-resolution-model.md#view-component-resolution-order) lists every file name and how a `setCrudComponents` entry replaces this lookup.
      _Rename any existing `src/views` file that matches one of these names but is not meant to replace a VUEDA view, such as `ViewList.vue` or `ViewAction.vue`._

#### Setup and dependencies

- **`@tiptap/extension-underline` removed from the client dependencies** ([#616](https://github.com/arrai-innovations/vueda/issues/616)):
    - The client no longer installs `@tiptap/extension-underline`. `WidgetHtml` gets the Underline extension from `@tiptap/starter-kit`.
      _An application that imports `@tiptap/extension-underline` directly must add it to its own dependencies._

### Features

#### Lists and querying

- **Choice labels in list columns** ([#645](https://github.com/arrai-innovations/vueda/issues/645)):
    - `ColumnText` shows a choice field's stored value as its [choice label](../../guides/customize-list-column-rendering.md), such as `Office` for `office`, and joins the labels of a many-valued field with `, `. The labels come from the field's `displayChoices`. When the field has none, they come from its `choices`, if those are a static list.
      _A project can remove a `field(<col>)` slot or column override that it added only to show choice labels._
- **To-many list columns show linked labels** ([#646](https://github.com/arrai-innovations/vueda/issues/646)):
    - A new default column, `ColumnModelLinks`, renders many-to-many fields and reverse foreign keys. An expanded relation shows the first three related labels, each linked when the viewer can open its view, and a "+N more" button opens a popover with the rest. An unexpanded relation shows its count, such as "3 items", in place of a `JSON` array of pks.
      _To show labels, expand the relation in the list request. See [Link a To-Many Column](../../guides/customize-list-column-rendering.md#link-a-to-many-column)._

#### Forms and validation

- **Record name heading on read and update views** ([#574](https://github.com/arrai-innovations/vueda/issues/574)):
    - `ViewRead`, `ViewUpdate`, and `DetailView` now show a heading above the fields that names the record by its formatted name, and they request `formatted_name` when the view's field lists leave it out. The `record-name` slot and the `recordName` and `recordNameSkeleton` theme keys customize the heading.
      _A serializer that shows `formatted_name` as a visible field now shows the name twice. Set `style={"hidden": True}` on that field to remove the field row._
- **Remove a saved `FieldSetSingularStackedInline` row** ([#610](https://github.com/arrai-innovations/vueda/issues/610)):
    - A writable singular stacked inline whose field is not required now shows a "Delete on save" toggle on its saved row. A pressed toggle keeps the row visible and makes the form submit the field as `null`, so saving removes the related object. The `destroy-toggle` slot and the `FieldSetStackedInlineRow.destroyToggle` theme key customize the toggle, and the singular inline no longer renders the `destroy-checkbox` slot.
- **Submit a form field as `null` without changing its value** ([#610](https://github.com/arrai-innovations/vueda/issues/610)):
    - `FormContext.submitAsNull(path)` and `FieldContext.submitAsNull()` make `submittingValues` hold `null` at a path while `values` keeps what the widgets show. `removeSubmitAsNull` sends the value again. Unlike an ignored field, the field still counts as modified.
- **Form props on `ViewRead` and `ViewCreate`** ([#611](https://github.com/arrai-innovations/vueda/issues/611)):
    - `ViewRead` now accepts `fetchFields` and the same form props as `ViewUpdate` and `DetailView`, such as `fields`, `expand`, `fieldProps`, and `formProps`. `ViewCreate` now also accepts `fields`, `fieldDetails`, `expand`, and `expandDetails` as its own props. Before, both views rendered these props as HTML attributes and ignored them.

#### Permissions

- **Model links show only views that the viewer can open** ([#643](https://github.com/arrai-innovations/vueda/issues/643)):
    - `LinkModelView` and the components that render through it, such as `ColumnModelLink`, render a link only when the target model's info or its workflow transitions list the view's action. Otherwise the label renders as plain text. The `view` prop of `LinkModelView` and `ColumnModelLink` accepts an ordered array, such as `["update", "read"]`, and links to the first view that the viewer can open.
- **Page-title actions render as buttons** ([#643](https://github.com/arrai-innovations/vueda/issues/643)):
    - The page-title actions in `DetailView`, `ViewRead`, `ViewUpdate`, `ViewCreate`, and `ViewList` now render as buttons instead of links, so they no longer offer "open in new tab" or a link preview.
      _Update end-to-end tests that select these page-title actions as `a` elements or by their `href` so that they select buttons instead._

#### History

- **`ViewHistoryList` shows workflow state changes** ([#527](https://github.com/arrai-innovations/vueda/issues/527)):
    - An event with `relation: "state"` reads "Workflow state" in the Model cell, and its `changes` show the old and new state. The cell carries `data-relation="state"` for theming.

#### Live updates

- **Live updates (`setupObjectStreams`)** ([#672](https://github.com/arrai-innovations/vueda/issues/672)):
    - After `setupObjectStreams()`, read and list views fetch again when a record changes on the server, and an update view shows a notice with a Reload button instead of changing the form. `ViewUpdate` adds a `change-notice` slot and `ViewRead` a `deleted-notice` slot.
    - [Set Up Websocket Subscriptions](../../guides/set-up-websocket-subscriptions.md) covers the server setup that it needs.

### Fixes

#### Forms and validation

- **Stacked inline row actions in narrow layouts** ([#598](https://github.com/arrai-innovations/vueda/issues/598)):
    - In `FieldSetStackedInline` and `FieldSetSingularStackedInline`, a row's action bar becomes a full-width footer below the row's fields when the row list is narrower than the `md` container size (28rem by default). In wider lists, the action bar stays beside the fields at the top end of the row.
- **`WidgetHtml` keeps a loaded record's HTML as saved** ([#612](https://github.com/arrai-innovations/vueda/issues/612)):
    - Since `client-v3.0.0-beta.1`, saving an update form wrote back each `WidgetHtml` value as the editor had rewritten it on load, even when the user changed nothing. The rewrite drops markup that the editor does not support, such as inline styles, classes, tables, and images. A loaded value now stays exactly as saved.
      _Check `WidgetHtml` values that have such markup and that were saved through an update form since `client-v3.0.0-beta.1`. Restore lost markup from a backup or from model history._
- **`FieldSetSingularStackedInline` keeps a saved object on update forms** ([#679](https://github.com/arrai-innovations/vueda/issues/679)):
    - Since `client-v3.0.0-beta.1`, an update form could replace a singular inline's saved object with an empty row when the inline's field objects loaded or changed after the record. Saving the form then sent the empty object in place of the saved one. The inline now auto-creates an empty object only when its field holds none, such as on a create form for an inline that is required or has `autoCreateWhenEmpty`.

#### Field types

- **`WidgetHtml` values match what the user did** ([#616](https://github.com/arrai-innovations/vueda/issues/616)):
    - Clearing the editor now sets the field to `""` instead of `<p></p>`, so a required field that the user clears fails the required check. A field that loaded empty and that the user clears again stays unmodified.
- **Read-only to-many fields show a linked label for each related object** ([#652](https://github.com/arrai-innovations/vueda/issues/652)):
    - `WidgetReadOnly` in lookup mode shows each related object of a many-to-many field as its `formatted_name`, separated by commas. An expanded value needs no request, and an unexpanded value loads its objects in one request. An empty relation shows the empty value.
      _A project that added a widget override or a slot only to show these labels can remove it, when the related model has a registered viewset and the view or model config makes the field read-only._
- **Labels for boolean fields in read views and lists** ([#665](https://github.com/arrai-innovations/vueda/issues/665)):
    - `WidgetBooleanReadOnly` and `ColumnBoolean` show a boolean field's [display labels](../../guides/customize-model-info-metadata.md#add-display-only-value-labels) in place of "Yes" and "No". A boolean field with static `choices` shows their labels too. A null value with a label shows that label in place of the dash.

#### Model metadata and data loading

- **`MultipleChoiceField` renders a multi-select** ([#650](https://github.com/arrai-innovations/vueda/issues/650)):
    - An editable form shows a `MultipleChoiceField` with the multi-select `WidgetCombobox` and submits a list of choices. Before, the form failed with "No widget component found".
      _Upgrade the server to 3.0.0b2, whose model info reports a `MultipleChoiceField` as `many`._
- **Serializer field subclasses use their ancestor's mappings** ([#650](https://github.com/arrai-innovations/vueda/issues/650)):
    - A project's own serializer field subclass now renders with the widget, column, props, and initial value of its nearest ancestor class that has a type mapping. Before, an editable form failed with "No widget component found" for such a field. A reverse foreign key declared with a `ManyRelatedField` subclass now renders read-only.
      _Upgrade the server to 3.0.0b2, whose model info lists each field's serializer ancestors in `type_serializer_ancestors`._

## v3.0.0-beta.1 (2026-10-21)

This is the first public beta of the VUEDA v3 client. It builds list, detail, form, action, and workflow screens from the metadata that the VUEDA server publishes. A project on client v2.0.4 upgrades with [Upgrade from VUEDA v2](../../guides/upgrade-from-v2.md), which also covers the matching server upgrade.

### Installation and Requirements

Install the beta from the public npm registry by its `beta` tag:

```bash
pnpm add @arrai-innovations/vueda@beta
```

The client requires:

- Node 22 or later.
- Vue 3.5, Vue Router 4.5, and Pinia 3.
- The peer dependencies in `package.json`, including `@arrai-innovations/reactive-helpers` 25, `@vueuse/core` 14, and `@arrai-innovations/vue-sonner` 2.0.11.
- Tailwind CSS 4 with `@tailwindcss/vite` for the default theme.
- A v3 VUEDA server. The client reads metadata shapes that only the v3 server sends.

[Client Plugin Prerequisites](../../guides/client-plugin-prerequisites.md) lists the setup that the application performs before it mounts.

### Capabilities

- **Controls and theme.** VUEDA ships its own controls, built on Reka UI, and a default theme of Tailwind classes and CSS tokens. You can restyle one instance, one component, a family of components, or the whole brand. [Theming and Customization](../../core-concepts/theming-and-customization.md) describes the four scopes.
- **Icons.** Components resolve icons through a registry. A Font Awesome Free preset fills it. [Register the Icons](../../guides/client-plugin-prerequisites.md#register-the-icons) shows the setup.
- **Layout.** The application layout owns the page title, page actions, and sticky bars, and views contribute to them. [Place the Page Title and Page Actions](../../guides/place-page-title-and-actions.md) shows the setup.
- **Lists.** List views sort by several fields through chips and keep the sort in the URL. They filter through chips with typed inputs, open scoped lists, and link rows to detail views. Columns render by field type and can show server column totals. [Configure `list`/`read`/`create`/`update` Views](../../guides/configure-crud-views.md) covers the options.
- **Forms.** Forms confirm server warnings before a write, upload files at any depth of a nested form, and render read-only values formatted by field type. A read-only file field shows a link to the stored file, and a user can clear an optional file field. [Require Confirmation Before a Write](../../guides/require-write-confirmation.md) covers the confirmation step.
- **Routing.** `makeCRUDRoutes` opens a route for each workflow transition by its code, rechecks access when the signed-in user changes, and honors the `routeActions` allowlist. [Routing and View Resolution Model](../../core-concepts/routing-and-view-resolution-model.md) describes the guard chain.
- **Auth views.** Default sign-in, forgot-password, reset-password, and reauthentication views cover two-factor sign-in and code-based reauthentication. [Build Auth Views](../../guides/build-auth-views.md) shows the routes that they expect. `AuthForm` keeps its reauthentication and sign-in redirects. Pass its `onSubmissionErrorHandler` prop to handle its other submission errors, as [Build a Form for a Signed-In Operation](../../guides/build-auth-views.md#build-a-form-for-a-signed-in-operation) describes.
- **User changes.** Stores clear metadata, configuration, choices, and workflow data when the signed-in user changes. [When the Signed-In User Changes](../../core-concepts/reactive-data-flow.md#when-the-signed-in-user-changes) lists what clears.
- **Build integration.** `vuedaViteConfig()` sets up the `@vueda` alias and deduplicates peer packages. When you pass your `src` directory as its `@` alias, it also finds convention-named action views.

### Known Limitations

- `useVersion().newClientAvailable` stays false unless the project defines `VITE_PACKAGE_VERSION` itself, because `vuedaViteConfig()` does not define it ([#300](https://github.com/arrai-innovations/vueda/issues/300)).
- Relation selects built on `WidgetModel` load only the first 200 options and have no search. List filter dropdowns have the same limit ([#381](https://github.com/arrai-innovations/vueda/issues/381)). `WidgetCombobox`, the default relation widget, searches the list endpoint and does not have this limit.
- A form does not report fields that failed to render. A user can submit a form with a field that they never saw ([#197](https://github.com/arrai-innovations/vueda/issues/197)).
- The client uses fixed query parameter names. A server that renames `o`, `s`, the page parameters, or `ct` needs a matching client change ([#301](https://github.com/arrai-innovations/vueda/issues/301)).
- A built-in theme module that loads after the application calls `setClassMerger` replaces the application's class merger ([#467](https://github.com/arrai-innovations/vueda/issues/467)).
- The design review of the default theme is incomplete, so default styles may change between betas ([#248](https://github.com/arrai-innovations/vueda/issues/248)).

## Public Baseline

VUEDA client versions before v3.0.0-beta.1 were private releases or prereleases. This page starts the public history at v3.0.0-beta.1.
