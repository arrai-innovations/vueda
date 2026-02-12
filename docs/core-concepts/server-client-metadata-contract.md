---
title: Server-Client Metadata Contract
type: explanation
audience: implementor
status: draft
---

# Server-Client Metadata Contract

The model-info API is the contract surface between VUEDA's server and client. It exposes the metadata that the client consumes to generate routes, forms, and views: field schemas, available actions, filtering and ordering capabilities, permission envelopes, and expand graphs.

This page describes the metadata surface, what each section means, and the semantics the client can rely on. For how models are added to the metadata surface, see [Canonical Registration and Model Discovery](./canonical-registration-and-discovery). For how the client mechanically derives UI from this metadata, see [Contract-First Dynamic UI](./contract-first-dynamic-ui).

## Why This Contract Exists

VUEDA's client does not contain per-model knowledge. It does not know which models exist, what fields they have, or what actions are available until it asks the server. The model-info API is how it asks.

This makes model-info the single integration seam between server and client. When the server contract changes, such as when a field is added, an action is removed, or a permission is revoked, the client adapts without code changes because it derives everything from metadata. But this also means the metadata contract must be precise: the client depends on specific keys, specific shapes, and specific semantics being present and stable. If the metadata surface is ambiguous or incomplete, the client cannot generate a correct UI.

## Authoritative Data Sources

Metadata is derived from canonical serializer and viewset definitions; it reflects what the server actually enforces, not a separate declaration layer.

**Field metadata comes from the serializer.** The `model_fields` section is derived from the canonical serializer's field definitions. Each field entry carries its type identifiers (`type_serializer`, `type_model`), constraints (required, read-only, max length, min/max values), choice indicators, help text, and label. If a field is read-only in the serializer, it is read-only in the metadata. If a field is not present in the serializer, it is not present in the metadata, even if the underlying Django model has the column.

**Action, filter, and ordering metadata come from the viewset.** The `model_actions`, `model_filtering`, and `model_ordering` sections are derived from the canonical viewset. Actions reflect the viewset's available CRUD operations plus any extra actions it defines. Filtering reflects the viewset's filterset configuration. Ordering reflects the viewset's declared ordering fields. Without a viewset, these sections are absent entirely; this is the difference between serializer-only and full [registration](./canonical-registration-and-discovery#viewset-presence-and-metadata-completeness).

**Permission metadata comes from content types.** The `model_permissions` section lists permission codenames associated with the model's content type. Unlike action visibility (which is user-sensitive), the permission list itself is not filtered by the requesting user; it reports all codenames that exist for the model.

## Metadata Sections and Semantics

A model-info detail response for a fully registered model contains the following sections:

**`model_fields`**: an object mapping field names to their metadata. Each field entry includes:

- Type identifiers (`type_serializer`, `type_model`) that the client uses for component resolution.
- Constraint properties: `required`, `read_only`, `max_length`, `min_value`, `max_value`, and others as applicable.
- `choices` either a list of `{value, display_name}` pairs for fields with static choices, or `true` for fields whose choices must be fetched from a dedicated endpoint.
- `label` and `help_text` for display purposes.
- For relational fields, additional properties indicating the related model and how the relationship is structured.

The field metadata is the client's authoritative source for form generation. Field types drive component selection, constraints drive validation behaviour, and choice indicators drive how option lists are loaded.

**`model_actions`** a list of action names available for this model, filtered by the requesting user's permissions. Standard CRUD actions use server-side names (`list`, `create`, `retrieve`, `update`, `partial_update`, `destroy`); extra actions use their declared names. The client normalizes some of these names for routing purposes (e.g., `retrieve` becomes `read` in client route naming), but the metadata itself uses the server-side names.

Action visibility is permission-sensitive: a user who lacks the `add` permission for a model will not see `create` in the action list. This filtering happens at the model-info level, not at the individual endpoint level; it is the metadata API's way of telling the client which actions the user is authorized to attempt.

**`model_filtering`**: describes the available filter fields, their types, and their lookup expressions. This tells the client which fields can be filtered on and which filter controls to render (text input, dropdown, date range, etc.).

**`model_ordering`**: lists the fields that can be used for ordering query results. The client uses this to determine which column headers are sortable.

**`model_permissions`**: lists all permission codenames associated with the model's content type. This is the full set of codenames, not filtered by user. The client can use this for advisory UX decisions, but must not treat it as an authorization check.

**`model_expand`**: describes the expand graph: which related models can be expanded inline and what field shapes those expansions carry. Expanded relations are flattened into the field namespace using double-underscore syntax (`expand_name__field_name`) on the client side.

### Object-Level Action Availability

Beyond model-level metadata, individual object payloads include an `available_actions` field. This field reflects per-object permission checks, including object-level permissions and workflow-state overlays, and indicates which actions are available for that specific instance. A user might have model-level `update` permission but lack it for a specific object due to workflow state or object-level checks. The `available_actions` field on the object payload captures this.

## Permission-Sensitive Behaviour

The metadata API treats permission filtering as a first-class concern, but it applies differently across sections.

**Action visibility is user-filtered.** The `model_actions` list in a model-info response only includes actions that the requesting user has permission to perform. A user without `delete` permission will not see `destroy` in the action list. This is evaluated at request time, not cached globally.

**Permission codenames are not user-filtered.** The `model_permissions` section reports all codenames that exist for the model's content type, regardless of whether the requesting user holds them. This allows the client to understand the full permission surface for UX purposes (e.g., explaining why an action is unavailable) without the server needing to expose which specific permissions the user holds.

**Extra actions have additional gating.** Beyond standard permission checks, extra actions are filtered through `get_allowed_extra_actions` on the viewset. This allows viewset authors to impose additional visibility constraints beyond the permission framework; for example, hiding an action based on object state or business logic rather than just permission codenames.

**Object-level actions are instance-sensitive.** The `available_actions` field on individual object payloads reflects object-level permission checks and workflow-state overlays. Model-level metadata tells the client what a user can generally do with this model; object-level `available_actions` tells the client what the user can do with this specific instance.

## Choices and Filter-Choices Contract

Choice data is split across multiple endpoints rather than being inlined entirely in the model-info response. This split exists because choice lists can be large, permission-sensitive, and context-dependent.

**Static choices** are inlined in field metadata as a list of `{value, display_name}` pairs. These are small, fixed sets defined on the serializer field (e.g., status codes, type enums). The client receives them with the model-info response and does not need to make additional requests.

**Dynamic choices** are indicated by `choices: true` in field metadata. This marker tells the client that the field supports choices, but those choices must be fetched from the dedicated model-info choices endpoint. The client is responsible for requesting them when the field is rendered, typically lazily, when a form containing the field is opened.

**Filter choices** are served by a separate endpoint from field choices. Filter choices reflect the values available for filtering, which may differ from the values available for form input; for example, a filter might offer "any" or aggregate options that are not valid form values.

**Permission checks on choices differ by type.** Local choices (values defined on the field itself) require read access to the model. Related-model choices (values from a foreign key or a many-to-many relationship) may also require list access to the related model. If the user lacks the necessary permissions, the choices endpoint returns an appropriate error rather than an empty list.

Choice values are normalized to strings in many response paths. The client should not assume that choice values are integers, booleans, or any specific type; they arrive as strings regardless of the underlying field type.

## Client Normalization and Caching Rules

The client does not consume model-info responses raw. It normalizes them into a stable internal shape before any downstream layer uses them.

**Normalization is a translation step, not an authority step.** The client strips the `model_` prefix from section keys, restructures nested properties for easier access, and identifies the primary key field. It does not add, remove, or reinterpret contract semantics during this process. What the server says, the client preserves.

**The client requires a detectable primary key.** During normalization, the client identifies which field in `model_fields` is the PK. If no field can be identified as the primary key, normalization fails, and the model is treated as unusable. This is a hard requirement regardless of registration state.

**Metadata is cached by `app.model` key.** Once fetched and normalized, metadata is stored in the `storeModelInfo` Pinia store keyed by the model's `app_label.model_name` identifier. Subsequent requests for the same model use the cached version.

**Fetch failures are also cached.** If a model-info request returns an error (including 404 for unregistered models), the failure is cached. The client will not retry the request until the cache is cleared, which typically requires a page reload. This prevents retry storms, but transient server errors can block the client until a reload.

**The client requests specific fields and expands.** Model-info requests include explicit `f` (fields) and `e` (expands) query parameters. The client does not request the full metadata surface by default; it requests the specific shape it needs for the current context. This is relevant for understanding why the same model might produce slightly different metadata responses in different contexts.

## Compatibility Expectations

The metadata contract is not versioned with explicit API version numbers. Instead, compatibility is maintained through structural conventions:

The server's metadata shape is derived from serializer and viewset definitions. When those definitions change, the metadata changes accordingly. These changes include: fields added, renamed, or removed; actions added or removed; filter configurations changed. The client adapts automatically because it derives UI from metadata rather than hardcoding expectations.

However, some changes are breaking from the client's perspective, even though the server handles them cleanly. Removing a field that the client's model-config references by name, or renaming an action that client-side workflow code references, will cause the client to silently drop the override or fail to resolve the action. The generated API documentation should be treated as an index into the metadata surface, not as an exhaustive behavioural specification. Validate against source code and tests when behaviour details matter.

## Failure Modes and Recovery

**Action naming drift.** The server uses names like `retrieve` and `partial_update`; the client normalizes these to `read` and `update` for routing purposes. If this normalization mapping is incomplete or a custom action uses a name that collides with a normalized name, the client may route to the wrong view or fail to resolve the action. The mapping is maintained in a static action-map utility on the client.

**Missing PK in metadata.** If the canonical serializer does not expose a field that the client can identify as the primary key, client-side normalization fails. The model becomes unusable regardless of how completely it is registered on the server.

**Cached fetch errors.** Model-info fetch failures are cached and block retry. If the server is temporarily unavailable, the client remains blocked until the page reloads. There is no automatic retry or cache expiration for failed requests.

**Choice endpoint failures.** If a dynamic-choices request fails (due to permissions, missing formatted-name conventions on related models, or server errors), the field renders without options. The client does not automatically retry choice requests.

**Stale metadata after server changes.** Because metadata is cached on the client, changes to the server contract (new fields, removed actions) are not reflected until the client re-fetches. In most deployment scenarios, this happens naturally on page reload, but long-lived sessions may operate on stale metadata.

## Relevant Implementation Surface

- Python:
  - `{@api py:module:vueda.info.registration}`
  - `{@api py:module:vueda.info.viewsets}`
  - `{@api py:class:vueda.info.serializers.ModelInfoSerializer}`
  - `{@api py:class:vueda.core.serializers.fields.AvailableActionsField}`
- REST:
  - `{@api rest:endpoint:GET:/vueda.info/model_info/}`
  - `{@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}`
  - `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
  - `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- JavaScript:
  - `{@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}`
  - `{@api js:module:@arrai-innovations/vueda.use/useModelInfo}`
  - `{@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}`
- Vue.js Components:
  - `{@api vue:component:ViewActionRouter}`
