---
title: Configure List/Read/Create/Update Views
type: how-to
audience: implementor
status: draft
---

# Configure List/Read/Create/Update Views

Once a model has a working CRUDL surface with routes, guards, metadata, and default views, the next step is customization. The server-derived defaults are often sufficient for basic surfaces, but most production models need adjustments. Common cases include showing different fields on the list versus the form, restricting actions by role, customizing redirect behaviour after a save, or configuring expanded relations for inline display.

This guide covers how to configure all of that through `storeModelConfig`, the client-side configuration store. Every customization described here works through the same mechanism: overriding the defaults produced by the metadata derivation pipeline, without forking core components. For how those defaults are derived, see [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui). For the prerequisite steps that produce a working surface in the first place, see [Create a CRUDL Surface](./create-crudl-surface).

## Goal and Preconditions

By the end of this guide, you will be able to control which fields appear in each view, which actions are available and to whom, how list columns behave, how expanded relations render, and where the client navigates after a successful create or update.

Before starting, confirm that:

- The model is fully registered with a serializer and viewset. It should appear in model-info responses.
- Client routes are wired through `makeCRUDRoutes` and use a functioning `requireModelInfo` guard.
- The default CRUD surface renders correctly, without any client-side config. List, read, create, and update views should all work.

If any of these are missing, complete [Create a CRUDL Surface](./create-crudl-surface) first. Configuration overrides layer on top of a working baseline; they cannot compensate for missing registration or broken routing.

## The Configuration API

All client-side view configuration flows through `storeModelConfig`, a Pinia store (a state management tool for Vue.js) that merges server-derived defaults with client-supplied overrides. The entry point is `setConfig`, a method that accepts a model identifier and two optional configuration layers:

```javascript
import { storeModelConfig } from "@arrai-innovations/vueda";

const modelConfigStore = storeModelConfig(pinia);

modelConfigStore.setConfig(
  { app: "inventory", model: "product" },
  {
    /* generic config, applies to all views */
    actions: {
      create: ["Administrator"],
      update: ["Administrator", "Member"],
      destroy: [],
    },
  },
  {
    /* view-specific overrides, keyed by action name */
    list: {
      displayFields: ["name", "sku", "category", "price"],
      sorted: ["-created"],
    },
    create: {
      submitFields: ["name", "sku", "category", "price", "description"],
    },
    update: {
      displayFields: [
        "name",
        "sku",
        "category",
        "price",
        "description",
        "notes",
      ],
    },
    retrieve: {
      displayFields: [
        "name",
        "sku",
        "category",
        "price",
        "description",
        "notes",
        "created",
        "modified",
      ],
    },
  },
);
```

The first argument is the model identifier, which is an object with `app` and `model` keys. These keys should match the server's `app_label` (the application label in your server) and model name (the database model you are referring to). The second argument is a generic configuration object that contains settings applied to all views. The third argument is an object keyed by action name, such as `list`, `create`, `update`, `retrieve`, or a workflow transition code. Here, each key represents a specific action or transition, and the corresponding value overrides the generic configuration for that particular view.

Both the generic and view-specific arguments are optional. When omitted, the store derives all configuration from the server model-info. Configuration is typically called from a centralized setup function such as `setupModelConfig(pinia)`, invoked during application initialization. This ensures all overrides are in place before any route guard or view component resolves config.

### Merge Precedence

Merge precedence is stable and predictable. From lowest to highest priority: server-derived defaults first, then generic config, and finally view-specific config. At render time, component props add a fourth layer on top of all three. For the full precedence model, see [Contract-First Dynamic UI](../core-concepts/contract-first-dynamic-ui).

Simple properties such as `displayFields` or `sorted` use last-wins: the highest-priority layer that provides a value wins entirely. Deep properties such as `fieldDetails`, `widgetProps`, and `expandDetails` are recursively merged. This lets you override only a single sub-key without restating the whole object.

One important edge case: setting an array property (a list of values) to an empty array (for example, `displayFields: []`) does not clear the field list. An empty override array will use the default list of fields from the server. This prevents accidental blank screens and means you must list the fields you want to see, rather than expecting the view to be empty if you provide an empty array.

## Baseline Config from Model Info

Before any `setConfig` call, `storeModelConfig` derives a full baseline from the model metadata fetched by `storeModelInfo`. This baseline lists what fields are shown (`displayFields`), fetched (`fetchFields`), and submitted (`submitFields`). It also includes related objects referenced in responses (`expand` relations), actions available on routes (`routeActions`), which actions are permitted, and options that can be filtered (`filterables`) or sorted (`sortables`). The baseline is based on what the server-side serializer (the code that defines which fields are exposed) and the viewset (the code that defines endpoints and actions) reveal. Field sets are defined by the serializer's field configuration. Actions are determined by viewset capabilities and filtered by user permissions. Filtering and sorting options are taken from the viewset's filterset and ordering settings.

The practical consequence is that many models need no `setConfig` call at all. If the server contract already describes the right fields, actions, and capabilities, the client renders a correct surface from metadata alone. Configuration overrides exist for the cases where the client needs to diverge from the server-derived baseline: showing fewer fields in a list than the server exposes, restricting actions by role, or customizing redirect behaviour.

Understanding what the baseline provides is the key to minimal configuration. Before writing overrides, inspect the model-info response for your model using the `/vueda.info/model_info/{app_label}/{model}/` endpoint. Confirm which defaults you actually need to change. See [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract) for details about each metadata section.

## Field Sets and View Consumption

Three field-set properties control what each view fetches, displays, and submits. These are: `displayFields`, `fetchFields`, and `submitFields`, and they can be set generically or per-view. Each serves a different purpose in the views (user interfaces for displaying or editing data).

`displayFields` determines which fields appear in the rendered UI. `ViewList` uses it for column selection. `DetailedView` (which is behind both read and update flows) uses it for form field rendering. Setting `displayFields` in list config to a short set of columns, while leaving update config with a fuller set, is a common pattern:

```javascript
modelConfigStore.setConfig(
  { app: "inventory", model: "product" },
  {},
  {
    list: { displayFields: ["name", "sku", "price"] },
    update: {
      displayFields: [
        "name",
        "sku",
        "category",
        "price",
        "description",
        "notes",
      ],
    },
  },
);
```

`fetchFields` determines which fields, or pieces of data, the client requests from the server. Views include `fetchFields` in their API (application programming interface) calls to limit the amount of data returned in the response. In most cases, the default value for `fetchFields`, which is taken from the serializer's field list (the set of data definitions used to format the response), is correct. Override `fetchFields` when you need the client to request a field not listed in `displayFields` (meaning fields that are not directly shown, such as a field used only in a computed column).

`submitFields` determines which fields are included in create and update payloads. In this context, a payload is the data sent to the server when creating or updating a record. `ViewCreate` and `ViewUpdate` are components that send only the fields listed in `submitFields` when saving. The primary key, which uniquely identifies a record, is automatically injected into the request fields by the view internals. You do not need to include the primary key in `submitFields`. Override `submitFields` when the form should submit only a subset of the displayed fields, or when the server's serializer (a component that validates and transforms data sent to the server) rejects fields that the default set includes.

A critical alignment rule: if `displayFields` includes a field that is missing from `fetchFields`, the view will try to render a field for which no data was fetched. This produces a blank or missing value. Always make sure that `displayFields` is a subset of `fetchFields`, or that any displayed field is available through another mechanism (such as an expanded relation).

## Action and Route Configuration

Action configuration controls which CRUD operations users can access and how navigation between routes behaves. Three properties govern this: `actions`, `routeActions`, and `actionRedirects`.

### Action Visibility

The `actions` property is an object that maps action names to visibility rules. Three value types are supported:

- `true`: the action is visible to all authenticated users.
- `[]` (empty array): the action is hidden from all users.
- `["Administrator", "Member"]`: the action is visible only to users in the listed groups.

```javascript
modelConfigStore.setConfig(
  { app: "inventory", model: "product" },
  {
    actions: {
      create: ["Administrator"],
      update: ["Administrator", "Member"],
      destroy: [],
    },
  },
);
```

This configuration hides the destroy action entirely, restricts create to administrators, and allows both administrators and members to update. Actions not listed in the `actions` object retain their server-derived defaults. Remember that client-side action filtering is a UX decision, not a security boundary: the server enforces permissions independently, regardless of what the client hides. See [Architecture Overview](../core-concepts/architecture-overview) for the authorization boundary model.

### Route Action Filtering

`routeActions` is an array that restricts which actions are navigable via the router. The `requireModelInfo` guard checks this list when resolving navigation; if an action is not in `routeActions`, the guard blocks navigation and shows an "Action Not Found" toast. When `routeActions` is not set, all server-advertised actions are navigable.

Use `routeActions` when you want to make an action callable via the API (e.g., for programmatic use) but not navigable as a standalone view. Keep `routeActions` aligned with actions; if `actions` hides an action from the UI but `routeActions` still includes it, the route is technically navigable even though no button leads to it. See [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model) for how guards consume this configuration.

One naming caveat: `routeActions` values are matched against canonical server action names (e.g., `retrieve`, not `read`). Using the client-facing route name instead of the server action name will cause the guard to reject navigation with an "Action Not Found" toast. The legacy property name `routerActions` is ignored with a console warning. Always use `routeActions`.

### Post-Action Redirects

`actionRedirects` controls where the client navigates after a successful create, update, or other action. It is an object mapping action names to redirect targets, with a `default` key as a fallback:

```javascript
modelConfigStore.setConfig(
  { app: "inventory", model: "product" },
  {
    actionRedirects: {
      default: ({ result }) => ({
        app: "inventory",
        model: "product",
        action: "read",
        pk: result.id,
      }),
    },
  },
);
```

Values can be strings (a static route name) or functions receiving `{ bulk, result }` and returning a route target. When no `actionRedirects` config is present, the default redirect target is derived from available actions with a preference order of `update`, then `read` (from `retrieve`), then `list`.

## List Behaviour and Defaults

List views have their own configuration surface for controlling filtering, sorting, pagination display, and column behaviour.

`filterables` and `sortables` control which fields can be filtered and sorted. These default to the server-advertised filter and ordering fields. Override them when you want the client to expose a subset of the available options: for example, hiding an internal status field from the user-facing filter controls while keeping it available for programmatic filtering.

`sorted` sets the default sort order as an array of field names, with a `-` prefix for descending order (e.g., `["-created"]`). This determines the initial sort when the user first loads the list, before any user interaction overrides it.

Four boolean flags control list UI chrome: `showTotalRecordNum`, `allowShowAllPages`, `alwaysShowAllPages`, and `allowColumnHiding`. Set them per-model when the default behaviour is not appropriate. For example, disable `allowShowAllPages` on a model with millions of rows to prevent expensive unfiltered queries.

## Field and Widget Component Overrides

The default component resolution pipeline maps field types from metadata to Field and Widget components through a static mapping table. When the default mapping is not what you need, two config properties let you substitute components without modifying the core mapping.

`fieldComponents` maps field names to replacement Field component references or string names:

```javascript
{
    fieldComponents: {
        line_items: "FieldSetTabularInline",
    },
}
```

`widgetComponents` does the same for Widget components:

```javascript
{
    widgetComponents: {
        description: "WidgetHtml",
        status: "WidgetReadOnly",
    },
}
```

String names resolve to registered components. Use these overrides to swap a text input for a rich-text editor, render a field as read-only in a specific view, or use an inline tabular layout for a nested relation.

`fieldProps` and `widgetProps` pass additional or modified props to Field and Widget components. These are objects mapping field names to prop objects, and they are recursively merged with the component's default props:

```javascript
{
    widgetProps: {
        notes: { rows: 10, autoResize: true },
    },
}
```

`formProps` provides form-level props, including `themeOverride`, which allows customization of the form layout when the default layout does not meet the model's needs.

## Expand and Inline Configuration

Expanded relations are nested objects fetched inline with the parent record. They are configured through `expand` and `expandDetails`.

`expand` is an array of relation names to fetch and display inline. It defaults to the expand graph advertised in model-info. Override it to limit which relations are expanded, or to add relations that the default does not include.

`expandDetails` provides per-expansion configuration. Each key in `expandDetails` is a relation name, and its value is an object controlling how that expansion renders:

```javascript
modelConfigStore.setConfig(
  { app: "orders", model: "order" },
  {},
  {
    retrieve: {
      expand: ["customer", "line_items"],
      expandDetails: {
        customer: {
          hidden: ["internal_notes", "credit_score"],
        },
        line_items: {
          hidable: true,
          hiddenByDefault: false,
          f: [
            {
              label: "Line Total",
              value: ({ item }) => item.quantity * item.unit_price,
            },
          ],
        },
      },
    },
  },
);
```

The `hidden` property is an array of sub-field names to exclude from display within the expansion. The `f` property defines synthetic fields. These are computed values with a `label` and a `value` function that receives the expansion item. These appear alongside the relation's real fields. `hidable` and `hiddenByDefault` control whether the expansion can be collapsed by the user and whether it starts collapsed.

Expanded fields are flattened into the field namespace using double-underscore syntax (`customer__name`, `line_items__quantity`). This means `fieldDetails`, `fieldComponents`, and `widgetComponents` overrides for expanded sub-fields use the same flattened key format as base fields. There is no separate API for configuring expanded fields.

For list views, `fieldDetails` on expanded fields supports `value` and `formatted` paths for column rendering. This controls how an expanded relation's sub-field appears as a list column:

```javascript
{
    list: {
        fieldDetails: {
            customer__name: {
                value: "customer.name",
                formatted: "customer.formatted_name",
            },
        },
    },
}
```

## Workflow Transition Views

When a model uses VUEDA's workflow system, workflow transitions appear as additional actions alongside the standard CRUD operations. View-specific config can be keyed by transition code, as with standard action names. The `defaultView` property within a transition's config specifies which built-in view to render for that transition. This lets you reuse the update or read view layout for a transition that collects additional input before changing state.

## Verification Checklist

After configuring a model's views, verify the following:

- List view renders the expected columns in the expected order, with working sort and filter controls for the fields you configured.
- Create and update forms that show the correct fields and successfully submit without server validation errors.
- Read view displays all intended fields, including expanded relations.
- Action buttons reflect the configured visibility rules. They should be hidden for users outside the specified groups and present for users within them.
- Post-action redirects navigate to the expected destination after create and update.
- Expanded relations render inline with the correct sub-fields visible and any synthetic fields computing correctly.
- Route guards block navigation to actions that `routeActions` excludes, showing the expected toast message.

## Troubleshooting

**Fields appear blank in the list or detail view.** The most common cause is a `displayFields` override that includes fields not present in `fetchFields`. Ensure every displayed field is also fetched. Check the network response to confirm the server is returning the expected fields.

**"Action Not Found" toast on navigation.** This typically means `routeActions` does not include the action you are navigating to, or the action name does not match the server's canonical name. Remember that `routeActions` uses server names like `retrieve`, not client route names like `read`. Also confirm the action appears in the model-info response. If the server does not advertise it due to permissions or viewset configuration, no client config can add it.

**Form submission fails with validation errors.** If `submitFields` includes fields the server serializer does not accept (or excludes fields the serializer requires), the server will reject the payload. Compare your `submitFields` against the serializer's writable field list in model-info. Fields marked `read_only` in metadata should not be in `submitFields`.

**`routerActions` has no effect.** The legacy property name `routerActions` is ignored with a console warning. Use `routeActions` instead.

**Expanded fields not rendering or override not applying.** Expanded field overrides must use double-underscore syntax (`expand__field`), not nested object paths. An override keyed as `{ customer: { name: ... } }` in `fieldDetails` will be silently ignored. Use `{ "customer__name": ... }` instead.

**Empty `displayFields` array does not clear the field list.** This is by design. Empty override arrays fall back to server-derived defaults rather than producing a blank view. To show a minimal set of fields, explicitly list only the fields you want.

**Action visibility config ignored.** Client-side action config can only narrow the server-advertised action set, not widen it. If the server does not include an action in model-info (because the user lacks permission or the viewset does not define it), no client config can make it appear. Check the model-info response for the current user first.

## Relevant Implementation Surface

- JavaScript:
  - `{@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}`
  - `{@api js:function:@arrai-innovations/vueda.stores/storeModelConfig.storeModelConfig}`
  - `{@api js:module:@arrai-innovations/vueda.use/useModelConfig}`
  - `{@api js:function:@arrai-innovations/vueda.use/useModelConfig.useModelConfig}`
  - `{@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}`
  - `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
  - `{@api js:module:@arrai-innovations/vueda.router/guards}`
- Vue.js Components:
  - `{@api vue:component:ViewList}`
  - `{@api vue:component:DetailedView}`
  - `{@api vue:component:ViewRead}`
  - `{@api vue:component:ViewCreate}`
  - `{@api vue:component:ViewUpdate}`
