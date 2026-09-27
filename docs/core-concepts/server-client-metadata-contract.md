---
title: Server-Client Metadata Contract
type: explanation
audience: integrator
status: draft
---

# Server-Client Metadata Contract

VUEDA's client builds its default UI from metadata that the server publishes for each registered model, called {@term Model Info}. The server produces this metadata in a predictable shape, and the client relies on what each part contains. From it, the client builds routes, forms, views, and {@term Action} buttons without per-model code.

This page describes each model-info section and the key names the server and the client use for it. [Architecture Overview](./architecture-overview) shows where the contract sits in the wider system.

## Why This Contract Exists

The metadata gives every registered model a working default UI, so an application starts from a full {@term CRUD} surface and can iterate quickly. The server describes each model's fields, actions, filters, ordering, permissions, and expands, and the client reads that description at runtime. With no client change, a field added to a serializer appears in forms and tables. An action the user lacks permission for shows no button.

Most applications customize some views. The default UI covers what fits its conventions. Where a view needs tweaking or does not fit, you override a field, a widget, or the whole view; [Contract-First Dynamic UI](./contract-first-dynamic-ui) describes how. The metadata still drives everything the overrides leave alone.

The server stays the only authorization boundary. The client uses metadata for UI decisions, such as hiding buttons and disabling fields. The server enforces permissions on every request whatever the metadata said. [Authorization vs UI Semantics](./authorization-vs-ui-semantics) describes that boundary.

## Metadata Sections

**The canonical serializer and viewset define the metadata.** A model column that the serializer's `fields` list omits never appears. A serializer method field with no column does appear. The {@term Canonical Serializer} is the field contract.

Each section has its own source:

**`model_fields`** comes from the canonical serializer. It maps each serializer field name to an entry with these keys:

- `label`, `help_text`, and `hidden`.
- `type_db`, `type_model`, and `type_serializer`: the database type, model field class, and serializer field class.
- `read_only`, `required`, and `many` (whether the field holds several values).
- Constraints when they apply: `min_value`, `max_value`, `min_length`, `max_length`, `max_digits`, `decimal_places`.
- `choices`: `false` for no choices, an inline list of `{label, value}` pairs for static choices, or `true` for an editable relation.
- `app_label` and `model` on a relation: the related model. The client uses them to call the choices endpoint.
- `display_choices`: read-only display labels for stored values. They do not change validation or the choices an editable widget offers.
- `pk: true` on the primary key field. The client requires it for object identity.

Models with a composite primary key follow [Composite Primary Keys](../guides/composite-primary-keys).

`type_db` and `type_model` come from the model field that the serializer field's `source` reaches, walked the way DRF reads it at runtime. Both are `null` when the source reaches no model field. The payload does not say why. [Failure Modes and Recovery](#failure-modes-and-recovery) covers the system check that reports these fields, and {@api py:module:vueda.info.field_resolution} documents the resolution rules.

**`model_actions`** comes from the canonical viewset. It lists the built-in {@term CRUD} actions the viewset implements and the requesting user passes: `list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`. Extra actions follow when `get_allowed_extra_actions` allows them. Each entry has `name`, `description`, `method_names`, `detail`, `bulk`, and, for a detail action, `parameters`: the URL argument names, such as `["pk"]`. Built-in actions come first, sorted by name, then extra actions, sorted by name. The order carries no priority. [Action Contract and Availability](./action-contract-and-availability) describes which actions appear and why.

**`model_ordering`** has two keys. `default` lists the field names the server orders by when a request sends no `?o=`. `fields` lists the fields a client may order by, each with a semantic type, and an `ascending` direction on those in the default. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics) describes the projection rules.

**`model_filtering`** comes from the viewset's `filterset_class`. It maps each filter name to an entry with its label, type information (database type, model field class, filter class), lookup expressions, required flag, `hidden` flag, and choice metadata. Relational filters point to the filter-choices endpoint instead of inlining their values. So do value-derived filters (`AllValuesFilter`, `AllValuesMultipleFilter`), whose options are the values a column holds now. Entries carry further keys when they apply: constraints, input behavior (input type, input formats, range suffixes), validation (error messages, help text, validators), and null and empty handling (`null_label`, `null_value`, `empty_label`, `empty_value`).

**`model_expands`** comes from the serializer's `Meta.expandable_fields`. Each descriptor describes a relation a response can embed when a request names it in the {@term Expand} parameter. It carries `name`, the related model's `app_label` and `model`, `many`, and `read_only`. It also carries the related serializer's field metadata under the `f` key, in the same per-field shape as `model_fields`. A descriptor is read-only when its serializer is a `VuedaReadonlySerializer` or `GenericForeignKeySerializer`, or when its options set `read_only`.

**`model_column_totals`** comes from the viewset's `column_totals`. It has one key, `fields`: the declared total names in declaration order. Each name is what a client asks for and the key its value comes back under in a paginated response's `columnTotals`. It is a separate section because totals are named after client columns and need not match any serializer field. It does not report the query parameter that requests totals; that name is a constant on both sides, like every [wire query parameter](./configuration-surface-and-defaults#wire-query-parameter-namespace). [Expose Aggregates in `list` Responses](../guides/list-column-totals) covers declaring and requesting totals.

**`model_permissions`** lists the codename and name of every Django permission for the model's {@term Content Type}. It is not filtered by the requesting user. When the canonical serializer subclasses `VuedaReadonlySerializer`, the list holds only the mapped `read` and `list` permissions, because that serializer offers no writes. The narrowing affects this list only; the other permission rows stay in the database. The bundled client does not read this section. It is for consumers such as permission editors.

A model appears as a top-level entry only when it is registered. [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) describes registration. An unregistered model can still appear inside a registered parent's `model_expands`, with field metadata built from the parent's expandable serializer. Its relation fields still need the child model registered to load choices, because the choices endpoints return `404` for an unregistered model.

## Customization Hooks

`model_fields` and `model_expands` are each built in two layers. A generation step builds what it can from the serializer. A public hook then lets the serializer author correct the result. The split exists because a `SerializerMethodField` has no model column and no fixed field class, so the generation step can only guess its type.

For `model_fields`, `ModelInfoSerializer.get_model_fields_data` builds the per-field entries. `ModelInfoSerializer.get_model_fields` then passes them through the canonical serializer's `get_field_model_info(fields)`. The default applies the serializer's `field_display_choices`, so an override that relies on those should call `super()`. The `vueda_info.W001` system check also runs `get_field_model_info`, on its own copy of the entries, before it decides whether to warn.

For `model_expands`, `generate_expand_model_info` builds one descriptor per `Meta.expandable_fields` entry. Each nested serializer's own `get_field_model_info` corrects the fields under `f`. `ModelInfoSerializer.get_model_expands` then passes the list through the canonical serializer's `get_expand_model_info(expands)`, which returns it unchanged by default. `generate_expand_model_info` is the internal step; the two `get_*` hooks are the customization surface.

All three methods live on {@api py:class:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin}, which `VuedaSerializer` includes. {@term Canonical Registration} requires only `Meta.model`, so `ModelInfoSerializer` looks each hook up with `getattr`. A canonical serializer without the mixin still gets `model_fields` from generation, but its `model_expands` is empty even when it declares `Meta.expandable_fields`. [Customize Model Info Field and Expand Metadata](../guides/customize-model-info-metadata) covers both hooks and serializers that do not inherit `VuedaSerializer`.

## Response Structure

The model-info endpoint ({@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}) returns every section in one response. The list endpoint ({@api rest:endpoint:GET:/vueda.info/model_info/}) returns the same shape for every registered model.

The base fields are `id` (the content type's primary key), `app_label`, `model`, `verbose_name`, `verbose_name_plural`, and `workflow_enabled`. The sections are expandable fields, present only when requested. The client requests them all at once through the sparse-fields parameter `f` and the expand parameter `e`. Its `f` list names every base field except `id`, so the client's copy has no `id`.

Each section stands alone and does not reference the others. `model_fields` describes fields whether or not they are filterable. `model_actions` is already filtered for the requesting user, so the client does not check it against `model_permissions`.

## Permission-Sensitive Behavior

**The action list depends on the requesting user.** The server checks each built-in action with the viewset's permission classes, as a request with that action's HTTP method. An action is left out when a class returns `False` or raises `PermissionDenied`, `NotAuthenticated`, Django's `PermissionDenied`, or `Http404`. Extra actions get no permission check here. Only `get_allowed_extra_actions` filters them, and `VuedaViewSet`'s default offers every extra action and gates only `history-list` on read permission. Two users can therefore receive different `model_actions` for the same model. [Action Contract and Availability](./action-contract-and-availability) describes these rules and the per-object `available_actions` field.

**The route guard admits only listed actions.** The `requireModelInfo` guard lets a navigation through only when the route's action is in `model_actions` (or is a workflow transition). A user without an action's permission cannot reach its route by typing the URL. The guard is a UI check; the server still enforces the request. [Routing and View Resolution Model](./routing-and-view-resolution-model) describes route admission.

## Choices Endpoints

Relational choices are not inlined in model-info. Related tables can hold thousands of rows, and a form needs them only for the fields it shows. Two endpoints serve them instead:

- Field choices: {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}.
- Filter choices: {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}.

Both check `read` on the model, plus `list` on the related model for a relation. The client requests one page of up to 200 options per field and shows only that page. Choice values are strings, including primary keys; [Primary Key and Identifier Discipline](./pk-and-identifier-discipline) describes that rule. [Model Choices, Lookup Fields, and Dynamic Options](../guides/choices-and-lookups) describes endpoint behavior, ordering, permissions, and filtering.

## Client Normalization

The server sends every key in snake case, and each section name starts with `model_`. `storeModelInfo` rewrites the keys before it stores the object. `useModelInfo` exposes the stored object as `info`. The client side follows these rules:

- **Top level.** `model_` is stripped from each key, `expands` becomes `expand`, and every key is camelCased. The client object's top-level keys are `appLabel`, `model`, `verboseName`, `verboseNamePlural`, `workflowEnabled`, `fields`, `actions`, `expand`, `ordering`, `filtering`, `columnTotals`, `permissions`, and `pk`.
- **`fields` and `filtering`.** The keys are field and filter names, which the server uses as lookup keys, so they stay as sent. Each entry's own keys are camelCased at every depth. A field named `first_name` stays `first_name`, and its `read_only` becomes `readOnly`.
- **`expand`.** Each descriptor's own keys are camelCased (`app_label` becomes `appLabel`). Its `f` map follows the `fields` rule: names stay as sent, and each entry is camelCased.
- **`actions`, `ordering`, `columnTotals`, `permissions`.** Object keys are camelCased at every depth, so `method_names` becomes `methodNames`.
- **Values.** No value changes. A field name inside `ordering.default` and a permission codename stay as the server sent them.

{@api js:interface:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo} documents the client object.

After renaming, the store sets `pk` to the name of the field whose entry has `pk: true`. If no entry has it, the store throws.

The store caches each model's result, and each failure, under an `{app}.{model}` key, and concurrent requests for one model share a single fetch. [Reactive Data Flow](./reactive-data-flow) describes these cache rules and when they clear.

## Compatibility Expectations

The server does not advertise a metadata version, and the client does not request one. Compatibility depends on both sides keeping the same shape across releases.

**Shape stability.** Section names, field entry keys, and action entry keys are stable interfaces. Adding a key to a section is backward-compatible, because the client ignores keys it does not read. Removing or renaming a key is a breaking change on both sides.

**Action names.** The server uses DRF action names (`retrieve`, `partial_update`, `destroy`). The client maps one route name to a server name: `read` becomes `retrieve`. Every other route name passes through unchanged.

**Serializer-only registration.** A model registered with a serializer and no viewset has empty `model_actions`, so the client can read its field schema but creates no routes for it. {@term Serializer-Only Registration} and [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) describe the rest of that state.

## Failure Modes and Recovery

**Any model-info failure redirects.** A model-info request for an unregistered model returns `404`. The client wraps that response, any other non-2xx response, and any network failure in a `ModelInfoError`. The route guard then shows a "Model Not Found" toast and redirects to the configured `actionRedirect`.

**Workflow without a definition fails the whole response.** A model that enables `class Vueda.Workflow` but has no workflow definition makes every model-info request for it fail with `WorkflowNotConfiguredError`, returned as `500`.

**Missing primary key.** When no field entry has `pk: true`, `storeModelInfo` throws a plain `Error` naming the model. The route guard rethrows it without a toast, and the store caches it like any other failure. The serializer's `fields` list must include the primary key.

**Cached failures stay until the cache clears.** A transient failure, such as a timeout during a deploy, blocks that model until the store clears its cache. [Reactive Data Flow](./reactive-data-flow) lists when that happens.

**An extra action named `read` is unreachable by name.** The route name `read` always maps to `retrieve`, so a route for an extra action named `read` checks `retrieve` instead.

**Choice endpoint `500` from `formatted_name`.** A model that sets `formatted_name = None` without `formatted_name_lookup_expression` or `get_formatted_name()` makes relation choices that list it fail with `500`. The `vueda_info.E001` system check reports this wherever Django runs system checks, such as `manage.py check` and `runserver`. [Create a CRUDL Surface](../guides/create-crudl-surface) describes `formatted_name` configuration.

**Unresolved field source or lookup expression.** The `vueda_info.W001` system check reports a registered serializer's field whose `source`, or whose model `<field>_lookup_expression`, reaches no model field. The warning names the serializer, the field, and the path that failed. It is advisory: it never stops `manage.py check`, and model-info still returns `null` for that field's `type_db` and `type_model`.

A `source` failure is exempt in three cases:

- The field reads the whole object (`source == "*"`), as every `SerializerMethodField` does.
- The model defines a callable `get_<field_name>()`.
- The canonical serializer's `get_field_model_info` fills in a non-null `type_db` or `type_model` for the field.

A `<field>_lookup_expression` failure is never exempt. The expression feeds `models.F()` for queryset annotation and Django admin's `lookup_field()`. Both resolve in the database, so a broken expression also breaks those uses, whatever the metadata says.

**Serializer-only registration blocks navigation.** With empty `model_actions`, the route guard blocks every route for the model with an "Action Not Found" toast. That is the intended state for a model without its own CRUDL surface.
