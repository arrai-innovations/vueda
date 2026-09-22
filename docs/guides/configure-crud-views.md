---
title: Configure `list`/`read`/`create`/`update` Views
type: how-to
audience: integrator
status: draft
---

# Configure `list`/`read`/`create`/`update` Views

This guide covers how to customize {@term CRUDL} view behaviour through model config overrides without forking core components. Every override described here builds on the defaults that {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig} derives from {@term Model Info}; the goal is to adjust only where the baseline does not meet your needs.

The guide assumes a working CRUDL surface is already in place. If the model is not yet registered and routable, start with [Create a CRUDL Surface](./create-crudl-surface). For the metadata contract that model config consumes, see [Server-Client Metadata Contract](../core-concepts/server-client-metadata-contract). For expand and sparse field controls specifically, see [Use Expand and Sparse Field Controls](./expand-and-fields-controls).

## Goal and Preconditions

The objective is a model whose `list`, `read`, `create`, and `update` views behave correctly with customized field sets, action availability, and interaction defaults, all controlled through `storeModelConfig` overrides rather than per-view component forks.

Before you begin, ensure the following are in place:

The model is registered with both a serializer and a viewset, and model-info returns complete metadata (fields, actions, filtering, ordering). The client routes are wired via {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} and the model is navigable in the browser. You have read access to the model-info response for the model you are configuring, so you can verify which fields, actions, and expansions the server advertises.

## Baseline Config from Model Info

`storeModelConfig` derives a complete default configuration from model-info the first time a model's config is requested. Understanding this baseline is essential because every override you set replaces part of it.

The defaults are:

- `displayFields` and `fetchFields`: every serializer field except the PK and fields marked `hidden`. Two views narrow this default:
    - `create` displays only writable fields. A new record has no value yet for a read-only field, and the server ignores input for one.
    - `list` displays and fetches only fields whose model-info entry does not set `list_default: false`. `HasWorkflowSerializerMixin` sets it on `workflow_state_code` and `valid_transitions`, so a workflow list shows `workflow_state_name` alone.
- `submitFields`: the same fields minus read-only ones.
- `expand`: all expandable field names declared on the serializer.
- `routeActions` and `actions`: all action names from model-info.
- `filterables`: all keys from the filterset definition.
- `sortables`: every field name in the model-info `model_ordering.fields` list — the fields a client may order by.
- `sorted`: the server's default sort order, from `model_ordering.default` (each name reversed with a leading `-` when its `ascending` flag is `false`).
- `actionDetails`: keyed by action name, each entry carries the `detail`, `bulk`, and other properties from the server's action metadata.
- `fieldDetails`: keyed by field name, each entry carries the field's type, label, choices, constraints, and other metadata.
- `actionRedirects`: `{ default: "update" }` if `update` is available, then `"read"` (from `retrieve`), then `"list"`, then `null`.

To override any of these, call `storeModelConfig().setConfig()` with the model identity, an optional generic override (applied to all views), and an optional view-specific override map:

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

storeModelConfig().setConfig(
    { app: "myapp", model: "widget" },
    // Generic overrides (all views)
    {
        displayFields: ["name", "status", "category"],
        fetchFields: ["name", "status", "category", "description"],
        submitFields: ["name", "status", "category", "description"],
        expand: ["category"],
    },
    // View-specific overrides
    {
        create: { submitFields: ["name", "category"] },
        list: { displayFields: ["name", "status"] },
    },
);
```

Generic overrides apply to every view. View-specific overrides are merged on top and take precedence for that view. If you set an empty array for `displayFields`, `fetchFields`, or `submitFields`, the config falls back to the model-info-derived defaults rather than producing an empty field set.

The narrower `create` and `list` defaults apply only when no override names that field list or the `fields` shorthand. A generic `displayFields` therefore reaches the `create` and `list` views unchanged. For `list`, an unset `fetchFields` follows the resolved `displayFields`, so naming list columns is enough to fetch them.

### Restore the full field list

Before these defaults, every view started from every non-PK, non-hidden field, and `submitFields` included read-only fields. To bring a read-only field back to a create form, or a flagged field back to a list, name the fields for that view:

```js
storeModelConfig().setConfig(
    { app: "myapp", model: "purchaseorder" },
    {},
    {
        create: { displayFields: ["reference", "supplier", "total_value"] },
        list: { displayFields: ["reference", "workflow_state_code", "workflow_state_name"] },
    },
);
```

To change the list default for one field in every project that uses a serializer, set the flag in the serializer field's `style`. `style={"list_default": False}` leaves a field out of the default list, and `style={"list_default": True}` keeps a field the mixin would leave out.

To consume the resolved config in a component, use {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}:

```js
import { useModelConfig } from "@vueda/use/useModelConfig.js";

const modelConfig = useModelConfig(
    toRef(props, "app"),
    toRef(props, "model"),
    "list", // view name
);

// modelConfig.config contains the resolved ModelConfig object
// modelConfig.info contains the raw model-info from the server
// modelConfig.loading / modelConfig.errored / modelConfig.error for state
```

## View-Specific Field Strategy

Each view consumes a different subset of the config's field properties. Aligning your overrides to what each view actually reads prevents surprises.

**`ViewList`** fetches using `fetchFields` and renders columns using `displayFields`. The fetch request always injects the PK into `fetchFields` even if it is not listed, so the list can identify rows for navigation and selection. A custom cell slot that reads a field with no column needs that field named in `fetchFields`. Column metadata (labels, types, sort eligibility) comes from `fieldDetails`. If `displayFields` includes a field that is not in `fetchFields`, the column will render with a missing value.

**`DetailView`** (used by `ViewRead` and `ViewUpdate`) retrieves using `fetchFields` and `expand`. It requests `available_actions` alongside the object data to render action buttons. Field rendering in the detail layout also reads from `fieldDetails`, including `expand.subfield` keys for expanded relation fields.

**`ViewCreate`** and **`ViewUpdate`** submit using `submitFields`. The PK is injected into the request payload automatically for update operations. The form model is built from `fieldDetails` for the fields in `submitFields`, which controls labels, types, required flags, and validation constraints.

When expansion metadata is present, `storeModelConfig` flattens expanded sub-fields into `fieldDetails` using `expand.subfield` keys. For example, if `category` is expanded and has a `name` field, the config will contain `fieldDetails["category.name"]`. This allows display and field configuration to target expanded sub-fields directly.

## Action and Route Strategy

Three config properties control action visibility at different layers, and keeping them aligned is important for predictable behaviour.

**`routeActions`** constrains which actions the `requireModelInfo` route guard permits. If `routeActions` is set, the guard filters model-info actions down to only those names that appear in the array. An action not in `routeActions` will produce an "Action Not Found" toast and redirect, even if the server advertises it. `routeActions` must use server-canonical action names (`retrieve`, not `read`), because the guard normalizes route action names before checking the list. See [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model) for the full guard chain.

**`actions`** narrows which actions are visible to view components through `useFilteredActions`. This controls the rendering of buttons in `ViewList`, `DetailView`, and `ViewCreate`. An action that passes the route guard but is not in `actions` will not appear as an action button, though the user can still navigate to it directly by URL.

**`actionDetails`** controls how each action is classified in the UI layer. `storeModelConfig` derives `actionDetails` from the server's action metadata, keyed by action name. Each entry carries at least `detail` and `bulk` flags:

- `ViewList` uses `actionDetails[action].detail` and `.bulk` to classify actions into row-level (detail) actions, bulk actions (operating on selected rows), and targetless actions (neither detail nor bulk, rendered as standalone buttons).
- `DetailView` and `ViewCreate` use `actionDetails[action].detail` to separate detail actions (shown per-object) from non-detail actions (shown as general buttons).
- `useLinkModelView` checks `actionDetails[action].detail || actionDetails[action].bulk` to decide whether a PK is required before enabling navigation links.

If an action is present in `actions` but missing from `actionDetails`, UI classification checks will drop it from rendered action buttons. When overriding `actionDetails`, ensure every action in `actions` has a corresponding entry.

## List Behaviour and Defaults

`ViewList` exposes several config properties for tuning list interaction beyond field selection.

**`filterables`** controls which fields appear in the filter UI. The default is all keys from the model's filterset definition. Override this to restrict which filters are available to the user. `filterableDetails` carries the metadata for each filterable field (type, choices, label) and is typically left at its default.

**`sortables`** controls which columns support sorting. The default is every field name the model-info `model_ordering.fields` list advertises. That list is not just the viewset's declared `ordering_fields`: it also covers the serializer-derived fields DRF falls back to when `ordering_fields` is absent, and every field named in `model_ordering.default`, which is always requestable — see [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics). **`sorted`** sets the initial sort state; it defaults to the server's own default sort order (`model_ordering.default`), not an empty sort — `ViewList` opens already sorted the way the server would sort it if no `?o=` were sent. A stored user preference, once one exists, takes precedence over this default; `SortGroup`'s `Reset sort` control restores it explicitly.

**List controls:**

- `showTotalRecordNum`: show the total record count in the list footer (default: `true`).
- `allowColumnHiding`: allow the user to show/hide columns (default: `false`).

Configure the rows-per-page selector through the `ViewList` props `pageSizeOptions` and `defaultPageSize`. Include `"all"` in `pageSizeOptions` to let users load every page, or set `defaultPageSize="all"` to start in that mode.

List preferences (visible columns, sort state, page size) are persisted per-user when preference persistence is enabled. Model config and `ViewList` prop overrides set the initial defaults; user preferences take precedence after the first interaction.

## Verification Checklist

With config overrides in place, verify the surface end-to-end:

- `list` view renders only the columns specified in `displayFields` and fetches the fields specified in `fetchFields`. The PK column is included in the fetch even if it's omitted from the config.
- `read` view renders all expected fields, including expanded sub-fields if `expand` is configured.
- `create` form contains only the fields specified in `submitFields` for the `create` view. Submission succeeds and redirects according to `actionRedirects`.
- `update` form contains only the fields specified in `submitFields` for the `update` view. Submission succeeds and redirects correctly.
- Action buttons in `list` and `detail` views match the `actions` list. Detail actions, bulk actions, and targetless actions are classified correctly per `actionDetails`.
- Navigating to an action excluded from `routeActions` produces an "Action Not Found" toast and redirects.
- Filters and sort controls reflect the `filterables` and `sortables` overrides.
- List controls (`showTotalRecordNum`, `allowColumnHiding`, page-size options) produce the expected UI behaviour.

## Troubleshooting

**List columns show empty values for some fields.** `displayFields` includes a field that is not in `fetchFields`. The field is rendered as a column, but its value is never fetched. Add the field to `fetchFields` or remove it from `displayFields`.

**Action button is missing from the view.** Check three things in order. First, confirm the action is present in the model-info response (`model_actions`); if not, the user may lack the permission. Second, check that the action is included in the `actions` config for that view. Third, verify that `actionDetails` has an entry for the action; a missing entry causes `useFilteredActions` to drop it.

**"Action Not Found" toast on navigation.** `routeActions` is filtering the action out. Entries in `routeActions` are compared against the server action names from `model_actions` (`retrieve`, `update`, `partial_update`, `destroy`, and so on). The only client route name that differs from its server action name is `read`, which the guard normalizes to `retrieve`; every other route segment (`update`, `destroy`, etc.) already matches its server action name. Use `retrieve` rather than `read` in `routeActions`.

**Create/update form rejects a field on submission.** `submitFields` includes a field that the server serializer does not accept for write operations (for example, a read-only field or a field not in the serializer's `fields` list). The server returns a 400 with a field-keyed validation error. Align `submitFields` with the server serializer's writable fields.

**Action renders in the wrong category (detail vs. targetless).** The `actionDetails` entry for the action has incorrect `detail` or `bulk` flags. For example, setting `detail: false` on a per-object action moves it from the row-level action list to the targetless button area. Review the server's action metadata and adjust `actionDetails` overrides to match the intended classification.

**Links to an action are always enabled, even without a selected object.** `useLinkModelView` checks `actionDetails[action].detail || actionDetails[action].bulk` to decide if a PK is required. If neither flag is set, the link is enabled unconditionally. Set `detail: true` or `bulk: true` on the action's `actionDetails` entry to gate the link on row selection.

**Expanded sub-field is not configurable in field details.** Expansion metadata is flattened into `fieldDetails` using `expand.subfield` keys only when the `expand` config is non-empty. If `expand` is overridden to `[]`, no expansion flattening occurs and `expand.subfield` keys will not be present in `fieldDetails`.

**Template route paths do not match project structure.** The provided project templates wire CRUDL routes in `client/src/router/index.js`. If your project does not use the template structure, this path will not apply. The `makeCRUDRoutes` call is project-level wiring and can live wherever your router is set up.

## Relevant Implementation Surface

- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
    - {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda/use/useModelConfig}
    - {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}
    - {@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes}
    - {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}
    - {@api js:module:@arrai-innovations/vueda/router/guards}
- Vue.js Components:
    - {@api vue:component:ViewList}
    - {@api vue:component:DetailView}
    - {@api vue:component:ViewRead}
    - {@api vue:component:ViewCreate}
    - {@api vue:component:ViewUpdate}
