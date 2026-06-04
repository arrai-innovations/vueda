---
title: Server-Client Metadata Contract
type: explanation
audience: integrator
status: draft
---

# Server-Client Metadata Contract

VUEDA's client generates its UI entirely from server-provided metadata. The contract between the two sides is not a formal schema negotiation or a versioned wire protocol. It is a set of structural conventions: the server produces metadata in a predictable shape, and the client consumes it with specific expectations about what is present, what is absent, and what is permission-sensitive. When those expectations are met, the client can generate routes, forms, views, and {@term Action} buttons without per-model wiring. When they are violated, the failures are specific and diagnosable.

This page describes the metadata contract, where each section originates, how permissions shape visibility, how the client normalizes and caches metadata, and the compatibility guarantees across releases. For where the contract sits within the broader architecture, see [Architecture Overview](./architecture-overview). For the practical steps of registering a model so it participates in this contract, see [Create a CRUDL Surface](../guides/create-crudl-surface).

## Why This Contract Exists

The alternative to a metadata contract is per-model client code: hand-written route definitions, form field lists, action buttons, and permission checks for every model in the application. That approach scales linearly with the number of models but breaks whenever a field is added, renamed, or removed.

The metadata contract eliminates that coupling. The server describes its own shape (fields, actions, filters, ordering, permissions, expand capabilities), and the client reads that description at runtime to generate everything it needs. Adding a field to a serializer makes it appear in forms and tables without a client code change. Removing a permission hides the corresponding action button without a client code change. The contract is the mechanism that makes convention-over-configuration work across the network boundary.

The contract is also the mechanism that keeps the server as the sole authorization boundary. The client uses metadata to make UX decisions (hiding buttons, disabling fields), but it treats those decisions as advisory. The server enforces permissions independently on every request. The metadata contract provides the client with enough information to build a good user experience without granting it authority.

## Metadata Sections

**Metadata shape is derived from serializers and viewsets, not from database tables.** This is a foundational distinction. A model can have database columns that never appear in metadata because they are not in the serializer's `fields` list. Conversely, a serializer can declare computed or method fields that have no database column. The serializer definition is the canonical field contract.

The metadata sections have different source authorities:

**`model_fields`** comes from the canonical registered serializer. Each field entry carries its label, type information (database type, model field class, serializer field class), read/write status, required flag, constraint metadata (min/max values, lengths, decimal precision), and a many flag indicating whether the field returns multiple values. Choice fields include either static choice lists or a pointer to the choices endpoint for relational fields. The PK field is marked with a `pk: true` flag, which the client requires for object identity. For models with a composite primary key, field metadata derivation retrieves the primary key field from `model._meta` rather than from a `pk` attribute on the model class, because composite primary key models do not expose a `pk` class attribute.

**`model_actions`** comes from the canonical registered viewset. Standard {@term CRUDL} actions (`list`, `retrieve`, `create`, `update`, `partial_update`, `destroy`) are included when the viewset supports them. Extra actions (defined with `@action` decorators) are included when `get_allowed_extra_actions` permits them. Each action entry carries a name, description, HTTP methods, boolean flags for `detail` (operates on a single object) and `bulk` (operates on multiple objects), and required parameters (for example, pks to identify the target objects for bulk operations).

**`model_ordering`** comes from the viewset's `ordering_fields`. Each entry carries a field name and a semantic type (`alpha`, `numeric`, `boolean`, `date`, `datetime`, `time`) derived from the field's database type. For models with a composite primary key, if no `ordering_fields` are defined on the viewset and no objects exist in the queryset, `get_model_ordering` returns an empty list rather than calling `OrderingFilter.get_valid_fields`. This is a temporary workaround: calling `get_valid_fields` calls `get_default_valid_fields` which raises an error for composite primary key models in this state. A pending change to the ordering infrastructure will acquire ordering information through a different code path, removing the need for this guard; until that change is deployed, the `model_ordering` metadata for such models is empty when no objects exist and no `ordering_fields` are declared.

**`model_filtering`** comes from the viewset's `filterset_class`. Each filter entry carries its label, type information (database type, model field class, filter class), lookup expressions, required flag, a hidden flag indicating whether the filter is shown in the UI, and choice metadata. Like field choices, filter choices for relational fields point to a dedicated endpoint rather than inlining all values. Entries carry additional optional properties when applicable: constraint metadata (min/max values, decimal places, digit and length limits), input behavior (input type, input formats, suffixes for range filters), validation (error messages, help text, validators), and null/empty handling (`null_label`, `null_value`, `empty_label`, `empty_value`).

**`model_expands`** comes from the serializer's `get_expandable_fields()`. Each entry describes a relation that can be embedded inline in API responses when requested via the `e` query parameter. Each entry carries the relation name, the related model's app_label and model name, a many flag indicating whether the relation returns multiple objects, a read_only flag, and field metadata for the related serializer's fields. The field metadata is produced by the same function as `model_fields` and follows the same per-field structure.

**`model_permissions`** comes from Django's permission framework for the model's content type. This is a list of permission codenames and display names. Unlike action metadata, the permission list is not filtered by the requesting user; it reflects all permissions for the model, regardless of who is requesting them.

A model must be registered to appear as a top-level entry in this contract. Registration is the discoverability boundary described in [Canonical Registration and Model Discovery](./canonical-registration-and-discovery). Without registration, the model has no model_info entry and the client cannot discover it independently. However, an unregistered model can still contribute field metadata if it is referenced as an expandable field on a registered model's serializer; in that case, its field data appears within the parent model's `model_expands` section.

## Response Structure

The {@term Model Info} endpoint ({@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}) returns all metadata sections in a single response. The sections are expandable: the client explicitly requests them via the `fields` and `expand` query parameters. In practice, the client always requests all sections together.

The base response always includes `id` (content type PK), `app_label`, `model`, `verbose_name`, and `verbose_name_plural`. The expanded sections (`model_fields`, `model_actions`, `model_ordering`, `model_filtering`, `model_expands`, `model_permissions`) are only present when requested.

Each section is self-contained. `model_fields` describes field shapes independently of `model_filtering`, even though some fields are also filterable. `model_actions` describes available operations independently of `model_permissions`, even though action visibility depends on permissions. The sections are not cross-referenced in the response; the client is responsible for correlating them (for example, matching filter names to field names, or checking whether an action's required permission is in the permission list).

The `model_actions` section sorts its entries in a stable order: standard CRUDL actions alphabetically, followed by extra actions alphabetically. This ordering is cosmetic and does not imply priority.

## Permission-Sensitive Behaviour

**Action metadata is filtered by the requesting user's permissions.** When a user requests model-info, the server evaluates each standard action by constructing a synthetic request with the user's identity and the action's HTTP method, then running the viewset's permission checks. If the check raises `PermissionDenied` or `Http404`, the action is excluded from the response. Extra actions are filtered through `get_allowed_extra_actions` if the viewset defines it.

This means two users requesting model-info for the same model may receive different `model_actions` lists. A user with only `read` and `list` permissions will see `list` and `retrieve` actions; a user with full {@term CRUDL} permissions will see all five standard actions. In both cases, any extra actions permitted for the requesting user are included on top of the standard ones.

**Navigation is gated by the action list.** The client `requireModelInfo` route guard reads the cached `model_actions` list before allowing navigation to a model route. If the target action is not in the list — because the server excluded it during permission filtering — the guard blocks navigation. This means a user who lacks permission for an action cannot reach that route even by constructing the URL manually. The server remains the authority; the route guard uses the metadata to prevent the attempt before it reaches the API layer.

**Object-level action availability is separate from model-level.** The model-info action list reflects model-level permission checks. Individual objects expose their own `available_actions` field through the serializer (via `AvailableActionsField`), which reflects object-level permission checks. A user might have model-level `update` permission but lack object-level permission for a specific object due to row-level access rules or workflow state. The model-info contract advertises what is structurally possible; the object-level field reflects what is currently permitted.

## Choices and Filter-Choices Contract

Field choices and filter choices are served by dedicated endpoints rather than being inlined in the main model-info response. This separation exists because choice lists can be large (thousands of related objects), are not always needed, and need to be paginated rather than returned in a single unbounded response.

**Field choices** are served at {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}. For static choice fields (CharField with `choices`), the endpoint returns `[{label, value}]` pairs sorted by label. For relational fields (ForeignKey, ManyToMany), the endpoint queries the related model's queryset, annotates each object with a `label` (derived from `formatted_name`) and a `value` (the PK cast to string), and returns the results sorted by label. For static choice fields, the `[{label, value}]` pairs are already included inline in the model-info field and expand metadata, so calling this endpoint for them is unnecessary, though it will still work and return the same data.

**Filter choices** are served at {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}. The behaviour mirrors field choices but operates on the filterset's field definitions. Filter choice responses include an empty choice entry (configurable via `empty_label`/`empty_value` on the filter or project settings) prepended to the list. The primary use case for this endpoint is dynamic search: the client passes the user's input as a query parameter, and the endpoint returns a filtered subset of choices suitable for updating a dropdown as the user types. Filters that use `startswith` or `contains` lookup expressions work particularly well here, since they narrow results progressively with each keystroke.

**Permission checks differ between choice types.** Requesting choices for any field on a model requires `read` permission for that model. Requesting choices for a relational field additionally requires `list` permission for the related model. If either check fails, the endpoint returns a 403 status code. This means a user who can view a model's form may not be able to load choice options for a related field if they lack permission on the related model.

Choice values are normalized to strings in the response. Even for integer PKs, the `value` field in the response is a string representation. The client handles this normalization transparently.

## Client Normalization and Caching Rules

The client does not consume the server response as-is. `storeModelInfo` applies several normalization steps before storing the data.

**Prefix stripping.** The `model_` prefix is removed from all section keys. `model_fields` becomes `fields`, `model_actions` becomes `actions`, and so on.

**Key renaming.** `expands` is renamed to `expand` to match the client's singular convention.

**Case conversion.** Snake_case keys throughout the response are converted to camelCase, with two exceptions: field names (the keys in the `fields` dict) and filter names (the keys in the `filtering` dict) are preserved as-is. This means a field named `first_name` on the server remains `first_name` as a field key in the client store, but its metadata properties (`readOnly`, `helpText`, etc.) are camelCased.

**PK detection.** After normalization, the store scans the `fields` object for an entry with `pk: true` and records the field name as `data.pk`. If no PK field is found, the store throws an error. Every registered model's serializer must include a PK field in its `fields` list, or the client will fail on metadata fetch.

**Caching on success.** Normalized metadata is stored by `{app}.{model}` key. Subsequent requests for the same model return the cached data immediately without a server round-trip. The cache persists for the lifetime of the SPA session.

**Caching on failure.** If a metadata fetch fails, the error is stored in the cache by the same key. Subsequent requests for the same model are immediately rejected with the cached error without retrying the server. This prevents a failing model from generating repeated requests (self-DDoS), but it also means that transient failures require a page reload to retry. There is no automatic retry or cache expiration for errors.

**Request deduplication.** If multiple components request metadata for the same model simultaneously, only one server request is made. All callers receive the same promise. The in-flight promise is cleaned up after resolution, regardless of the outcome.

## Compatibility Expectations

There is no metadata for wire version or schema negotiation between the server and the client. The server does not advertise a metadata version, and the client does not request a specific version. Compatibility depends on both sides preserving the same structural conventions across releases.

**Metadata shape stability.** The top-level section names, the field metadata properties, and the action entry structure are treated as stable interfaces. Adding new properties to existing sections is backward-compatible; the client ignores properties it does not recognize. Removing or renaming existing properties is a breaking change that requires coordinated updates.

**Action name compatibility.** The server uses DRF canonical action names (`retrieve`, `partial_update`, `destroy`). The client maps a small set of UI-friendly route names to these canonical names through a static alias table. Currently, the only alias is `read` to `retrieve`. All other action names pass through unchanged. This means the client can use `read` in route paths while the server advertises `retrieve` in metadata, and the mapping is handled automatically.

**Serializer-only registration is a reduced contract.** A model registered with `register_serializer` (no viewset) produces metadata with `model_fields`, `model_expands`, and `model_permissions`, but `model_actions`, `model_ordering`, and `model_filtering` are empty. The client can discover the model and its field schema, but cannot generate standalone routes for it because there are no actions to gate navigation. This is the expected contract for models referenced via expands or choices that do not have their own CRUDL surface. When a serializer-only model is used as an expandable inline on a registered parent model, the parent's form renders the inline fields correctly using the field metadata from the serializer-only registration.

## Failure Modes and Recovery

**Unregistered model returns 404.** Requesting model-info for a model that is not in the registration registry returns a 404. The client wraps this in a `ModelInfoError`, displays a "Model Not Found" toast, and redirects to the configured `actionRedirect` target.

**Missing PK field is a client error.** If the server response does not include a field with `pk: true`, `storeModelInfo` throws during normalization. This is a configuration error: the serializer's `fields` list must include the model's primary key field. The error message identifies the model, but the symptom is a failed metadata fetch that gets cached as an error.

**Cached fetch failures block retry.** Because failed fetches are cached, a transient server error (network timeout, deployment in progress) will block all subsequent requests for that model until the user reloads the page. This is a deliberate tradeoff: preventing request storms is prioritized over automatic recovery. If the failure is permanent (e.g., an unregistered model or a misconfigured serializer), the cache behaviour is correct.

**Action naming drift.** If the server introduces a non-standard action name that collides with a client alias (for example, a custom action literally named `read`), the client's normalization will map it to `retrieve`, which may not match the server's intent. In practice, custom actions should avoid names that overlap with standard CRUDL action names.

**Choice endpoint failures.** Choice endpoints can fail if the model's `formatted_name` resolution is misconfigured. If the model sets `formatted_name = None` without providing `formatted_name_lookup_expression` or `get_formatted_name()`, the choice endpoint returns a 500 when it attempts to annotate a non-existent field. A system check (`vueda_info.E001`) detects this misconfiguration at startup, so the problem is reported before any choice endpoint is first requested. See [Create a CRUDL Surface](../guides/create-crudl-surface) for `formatted_name` configuration strategies.

**Serializer-only registration blocks navigation.** A serializer-only registration produces an empty `model_actions` list. The `requireModelInfo` route guard computes an empty allowlist and blocks all navigations to the model with "Action Not Found" toasts. This is correct behaviour for models that are not intended to have their own CRUDL surface, but it can be confusing if the registration was intended to be full. Verify that `register` (not `register_serializer`) was called with both a serializer and a viewset. Models registered with only a serializer that are rendered as expandable inlines on a parent model are expected to block standalone navigation; the inline fields are still rendered correctly through the parent's expand metadata.

**Generated API docs are pointers, not the full contract.** The generated API reference pages document endpoint signatures and field types, but they do not capture all behavioral nuances (permission sensitivity, choice resolution, error shapes). When behaviour questions arise, validate against the source code and tests rather than relying solely on generated docs.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.info.registration}
    - {@api py:module:vueda.info.viewsets}
    - {@api py:class:vueda.info.serializers.ModelInfoSerializer}
    - {@api py:class:vueda.core.serializers.fields.AvailableActionsField}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/}
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda/use/useModelInfo}
    - {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}
- Vue.js Components:
    - {@api vue:component:ViewActionRouter}
