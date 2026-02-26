---
title: Error and Validation Contract
type: explanation
audience: implementor
status: draft
---

# Error and Validation Contract

VUEDA defines a contract for how validation failures, warnings, and request errors flow from the server to the client and ultimately into form state. The contract spans four boundaries: server exception shaping, HTTP status classification, client error parsing, and form-context ingestion. Understanding where authority resides at each boundary and what happens when a response does not conform is essential for diagnosing validation behaviour.

This page explains the contract itself: what shapes are produced, how they are classified, and where they end up. For the client-side state model that consumes this contract, see [Form State and Validation Lifecycle](./form-state-and-validation-lifecycle). For practical steps on wiring validation into forms, see [Handle Form Validation and Server Errors](../guides/form-validation-and-errors).

```mermaid
flowchart TD
    subgraph Server
        VVE["VuedaValidationError<br/>(is_warning=False)"]
        VVW["VuedaValidationError<br/>(is_warning=True)"]
        EH["Exception Handler<br/>+ serverStack"]
    end

    VVE -- "field: [msg]" --> EH
    VVW -- "field: [warnings: [msg]]" --> EH
    EH -- "HTTP 400" --> GATE

    subgraph Client["Client Adapter"]
        GATE{{"Status<br/>= 400?"}}
        FVE["FormValidationError<br/>constructor"]
    end

    GATE -- "Yes" --> FVE
    GATE -- "No" --> FE["FetchError<br/>(no form feedback)"]

    FVE -- "flatten & split<br/>on .warnings regex" --> SPLIT

    subgraph FormState["Form State (useForm)"]
        SPLIT{{"Path contains<br/>.warnings?"}}
        ERR["state.errors[field].server<br/>(blocks submission)"]
        MSG["state.messages[field].server<br/>(non-blocking warning)"]
    end

    SPLIT -- "No" --> ERR
    SPLIT -- "Yes" --> MSG

    ERR --> RENDER_E["FormFeedback type=error<br/>severity=error (red)"]
    MSG --> RENDER_W["FormFeedback type=message<br/>severity=warn (yellow)"]

    style Server fill:#f8f4e8,stroke:#c9a227
    style Client fill:#e8f0f8,stroke:#2768c9
    style FormState fill:#e8f8ec,stroke:#27c94a
```

<!-- diagram caption="Validation flow from server exception to form feedback rendering" -->

## Boundary and Authority

The server is the sole authority over validation outcomes. It decides what is valid, what is a warning, and what shape the error payload takes. The client is the authority over how those payloads are represented in the runtime state and rendered in the UI. Neither side has visibility into the other's internal logic; they communicate solely through HTTP responses.

The contract has a single classification gate: **HTTP 400 means form validation; everything else does not.** This is a deliberate constraint. The client's CRUD adapters, auth handlers, and action form components all share the same rule: 400 responses are wrapped in `FormValidationError` and routed into form state. Non-400 failures (`FetchError`, `ListFilterError`, or resolver-specific classes) follow generic error handling paths and do not populate form feedback. This means that a validation-shaped payload returned with a 500 status will never appear in form fields, and a generic error returned with a 400 status will be treated as validation feedback.

## Wire Error Shapes and Status Branches

### The canonical validation shape

Server validation failures are produced by `VuedaValidationError`, which extends DRF's `ValidationError` with two additions: a warning flag and normalization guarantees. The constructor normalizes scalar values into a list and preserves dict/list structures recursively. This means the client can always expect either a field-keyed dict (`{"field": ["message"]}`) or a non-field list (`["message"]`), never a bare string.

The exception handler (`debug_stack_exception_handler`) adds two transformations before the response is sent. First, if the top-level detail is a list (non-field errors), it rewrites it to `{non_field_errors: [...]}` using DRF's `NON_FIELD_ERRORS_KEY` setting. This ensures that non-field errors always arrive under a stable key that the client can look up. Second, it appends a `serverStack` property to the response payload: in DEBUG mode and tests, this includes the full traceback; in production, it includes only the exception text. The client strips `serverStack` from the payload before parsing field paths.

### Warning wire format

When `VuedaValidationError` is constructed with `is_warning=True`, the detail is wrapped in a `{"warnings": [...]}` structure through the `get_error_details_as_warning` helper. The exception code is set to `"warning"` instead of the default `"error"`. On the wire, a warning payload for a field looks like:

```json
{ "field_name": [{ "warnings": ["Be careful about this value"] }] }
```

While a standard error for the same field looks like:

```json
{ "field_name": ["This value is invalid."] }
```

A single response can contain both errors and warnings for different fields, or even mixed entries for the same field. The client parser uses the structural presence of `.warnings` in the flattened path to distinguish them; it does not inspect error codes.

Warning-only exceptions receive special treatment in production: the exception handler checks `contains_only_warnings(exc)` and, if true, skips Sentry capture and database logging. The default logging configuration also includes a `FilterOutVuedaValidationWarnings` filter that suppresses warning-only validation from file logging. This reflects the design intent: warnings are informational feedback, not application errors.

### Input-shape rejection

VUEDA deliberately deviates from DRF's default behaviour for unknown fields in requests. Where DRF silently ignores unrecognized input fields, VUEDA rejects them. This policy is motivated by a practical concern: silent acceptance of unknown fields can lead developers to believe their data is being persisted when it is not.

The rejection operates at two layers:

**At the serializer layer**, `NoExtraFieldsSerializerMixin` (included in `VuedaSerializer`) overrides `validate()` to compare the incoming `initial_data` keys against the serializer's declared `fields`. Unknown input fields produce a field-keyed 400 response: `{"unknown_field": ["Invalid field. Valid fields are ..."]}`. The mixin also checks `expand` parameters at the serializer level, comparing requested expands against `_expandable_fields`. These rejections are field-keyed 400s that map cleanly to `FormValidationError` on the client.

The mixin is aware of complex field name syntax; it parses bracket-indexed (`items[0]quantity`) and dot-delimited (`items.quantity`) names to extract the base field for comparison. It also intentionally skips validation for nested serializers (checking whether the serializer is the top-level one for the view), avoiding redundant checks on child serializers.

**At the viewset layer**, `NoExtraFieldsForViewSetMixin` (included in `VuedaViewSet`) validates query parameters on list and `retrieve` actions. This validation has two distinct paths with different error behaviours:

For flex-field parameters (`f` for fields, `e` for expands), the mixin calls `validate_flex_field_param` and `validate_flex_expand_param`. Invalid field or `expand` names produce field-keyed 400 responses (`{"invalid_field": [...]}` or `{"invalid_expand": [...]}`), which map to `FormValidationError` on the client. The expand validation accounts for action-specific `permitted_expands` context, allowing different actions to permit different `expand` sets.

For filter query parameters (on `list` actions), the mixin builds an allowlist from the filterset class's declared filters, plus recognized framework parameters (pagination, ordering, search, flex-fields). Unknown query parameters that do not match any declared filter raise a `VuedaValidationError` with a field-keyed 400 response: `{"unknown_param": ["Invalid query parameter.  Valid filters are ..."]}`. All unrecognized parameters are reported in a single response. This is consistent with flex-field validation and NoExtraFieldsSerializerMixin. The client sees a `FormValidationError` and can route the errors into the form state.

The `om` (omit) flex-field parameter is an additional asymmetry: it is recognized as a valid query parameter (not rejected as unknown), but its values are not validated against the serializer's field list at either the serializer or viewset layer.

## Non-Field and Nested Path Semantics

The client preserves field paths from the server payload as-is in form state. A server error keyed by `address.city` becomes `state.errors["address.city"]`. A server error for an array item keyed by `items[0].quantity` becomes `state.errors["items[0].quantity"]`. The client does not parse or decompose these paths; they are treated as opaque string keys.

Non-field errors use the stable key `non_field_errors`, defined by DRF's `NON_FIELD_ERRORS_KEY` setting. The server's exception handler ensures this key is used even when the original exception was a bare list. On the client, `NON_FIELD_ERRORS_KEY` is mirrored as a constant, and form feedback components check for it specifically when rendering form-level (non-field) feedback.

The `FormValidationError` constructor flattens the response payload into paths using a recursive path-flattening utility. This handles nested dicts and arrays: `{"items": [{"quantity": ["Too large"]}]}` flattens to a path like `items[0].quantity[0]`, which is then normalized to `items[0].quantity` for the error map key. The flattening also handles structured objects: a path ending in `.detail` indicates a structured feedback object rather than a string message, and the parent path (without `.detail`) is used as the key.

## Warning Channel Semantics

The warning channel is a parallel transport mechanism that uses the same HTTP 400 status and the same `FormValidationError` parsing path as errors, but routes to a different destination in form state.

On the server, `VuedaValidationError(detail, is_warning=True)` wraps the detail through `get_error_details_as_warning`, which produces `{"warnings": [...]}` structures at the leaf level. On the client, `FormValidationError` detects these by testing each flattened path against the regex `/\.warnings(\[\d+\])?/`. Matching paths are collected as warning paths; non-matching paths are collected as error paths. Warning paths have the `.warnings` segment stripped during normalization so that the resulting key maps to the same field name as an error would.

The two maps, `FormValidationError.errors` and `FormValidationError.messages`, are then ingested into form state separately: errors go to `state.errors[name].server`, messages go to `state.messages[name].server`. This separation is what makes warnings non-blocking: the submission pipeline checks only `state.errors`, so `state.messages` entries never prevent submission.

A response can contain both errors and warnings. The parser processes them independently; there is no mutual exclusion. A field can have a blocking error and a non-blocking warning simultaneously, and both will be visible in the form UI (as error-severity and warning-severity feedback, respectively).

## Client Classification and Form-State Ingestion

Client CRUD adapters (`objectCrud` for `create`/`update`/`delete`, `listCrud` for bulk delete, `storeUser` for authentication, `ModelActionForm` for action execution) all follow the same classification rule: HTTP 400 becomes `FormValidationError`, everything else becomes `FetchError` or a more specific non-form error class.

`FormValidationError` construction happens at the adapter layer, before the error reaches any form-context handler. The constructor:

1. Strips `serverStack` from the payload and stores it separately.
2. Flattens the remaining payload into paths.
3. Splits paths into warning and non-warning sets using the warnings regex.
4. Extracts structured-object paths (those with a `.detail` suffix) and string paths.
5. Builds the `errors` map from non-warning paths and the `messages` map from warning paths.

Form context ingestion occurs when `handleServerFormValidationError(error)` is called. This iterates `error.errors` and `error.messages`, writing each entry under the `server` code key. The `server` code is what distinguishes server-originated feedback from local validation (`required`, `validate`) in the two-dimensional error storage.

The `server` code is reserved and runtime-enforced in client form APIs. Local calls that try to write `server` through `updateError` or `updateMessage` throw; only `handleServerFormValidationError` is allowed to populate that namespace.

`clearServerErrors(name, dependents)` is the selective clearing mechanism. It deletes only the `server` code for a given field (from both errors and messages), then recurses through dependent paths. The `$parent` placeholder in dependent paths resolves to the dot-delimited parent of the current field's name, enabling sibling-field clearing in nested/array structures.

First-error resolution (`getFirstErrorField`) scans the error map in a defined priority order: `non_field_errors` first, then displayed fields in their declared order. For array fields, it expands the search to bracket-keyed paths. For fields using `__`-delimited nesting conventions, it resolves the parent array and searches nested keys within items. This ensures that first-error scroll navigation reaches the correct DOM element regardless of how the error path is structured.

## Permission and Not-Found Branches

Not all server error responses participate in the validation contract. Some endpoints use non-400 status codes for failures that are structurally different from validation.

The choices and filter-choices endpoints (`ModelInfoChoicesViewSet`, `ModelInfoFilterSetChoicesViewSet`) under {@term Model Info} use **404** for invalid model, field, or filter identifiers, and **403** for permission denials. These are not validation failures; they indicate that the requested resource does not exist or is inaccessible. On the client, these responses produce `FetchError` instances (not `FormValidationError`), which are surfaced through generic error handling rather than form feedback.

This means that a form component fetching choices for a field that references an invalid model will not see a validation error in the form UI. The error will appear in whatever error boundary or catch handler the component uses for `FetchError`, which is typically a toast or a loading-error state rather than field-level feedback.

## Observable Failure Signatures

**Non-object response payloads.** `FormValidationError` assumes an object-like payload (`const data = { ...responseData }`). If the server returns a non-object 400 response (for example, a bare string or an array), the spread produces unexpected keys or an empty object, and the resulting error/message maps may be sparse or empty.

**Warning-only responses on form-validation transport.** A response containing only warnings still uses HTTP 400 and still arrives as a `FormValidationError`. The client routes all entries to `.messages` (none to `.errors`), so the form will not show any blocking errors. However, callers that treat any `FormValidationError` as a hard failure (without checking the error/message split) may incorrectly block the user.

**Non-field errors in field-level components.** `non_field_errors` entries are rendered by `FormFeedback` only when it is at the form level (inside a form context but outside a field context). Field-level `FormFeedback` instances do not automatically pick up non-field errors. If a form does not include a form-level `FormFeedback`, non-field errors will appear in state but be invisible in the UI.

**Choices endpoint 404 vs validation 400.** A missing or invalid model/field/filter on a choices endpoint returns 404, not 400. Code that only handles `FormValidationError` will miss these failures. The error surfaces as a `FetchError` and must be caught separately.

**Omit parameter not validated.** The `om` flex-field parameter is accepted as a recognized query parameter but its values are not checked against the serializer's field list. Invalid `omit` values pass through silently rather than producing a validation error.

## Relevant Implementation Surface

- {@api py:module:vueda.core.exceptions}
- {@api py:function:vueda.core.exceptions.debug_stack_exception_handler}
- {@api py:class:vueda.core.exceptions.VuedaValidationError}
- {@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin}
- {@api py:function:vueda.core.serializers.NoExtraFieldsSerializerMixin.validate}
- {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}
- {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_field_param}
- {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_param}
- {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.list}
- {@api py:class:vueda.info.viewsets.ModelInfoChoicesBaseViewSet}
- {@api py:function:vueda.info.viewsets.ModelInfoChoicesBaseViewSet.check_permissions}
- {@api py:function:vueda.info.viewsets.ModelInfoChoicesViewSet.validate_queryset}
- {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.validate_queryset}
- {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- {@api js:module:@arrai-innovations/vueda.utils/errors}
- {@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError}
- {@api js:property:@arrai-innovations/vueda.utils/errors.FormValidationError.errors}
- {@api js:property:@arrai-innovations/vueda.utils/errors.FormValidationError.messages}
- {@api js:property:@arrai-innovations/vueda.utils/errors.FormValidationError.serverStack}
- {@api js:module:@arrai-innovations/vueda.utils/objectCrud}
- {@api js:module:@arrai-innovations/vueda.utils/listCrud}
- {@api js:module:@arrai-innovations/vueda.stores/storeUser}
- {@api js:module:@arrai-innovations/vueda.use/useForm}
- {@api js:property:@arrai-innovations/vueda.use/useForm.FormContext.handleServerFormValidationError}
- {@api js:property:@arrai-innovations/vueda.use/useForm.FormContext.clearServerErrors}
- {@api js:property:@arrai-innovations/vueda.use/useForm.FormContext.getFirstErrorField}
- {@api js:function:@arrai-innovations/vueda.use/useObjectForm.defaultOnSubmissionError}
- {@api js:property:@arrai-innovations/vueda.utils/constants.NON_FIELD_ERRORS_KEY}
- {@api vue:component:ActionForm}
- {@api vue:component:ModelActionForm}
