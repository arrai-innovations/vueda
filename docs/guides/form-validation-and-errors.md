---
title: Handle Form Validation and Server Errors
type: how-to
audience: integrator
status: draft
---

# Handle Form Validation and Server Errors

This guide covers the end-to-end flow for getting server validation errors into form feedback, clearing them on user interaction, and gating submission on local versus server validation. It applies to both standard {@term CRUDL} forms (via `useObjectForm`) and custom forms that wire their own submission logic.

The guide assumes familiarity with the form state model. If you have not read [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle), start there; it explains the two-channel state model (errors vs messages), the code-key namespacing (`required`, `validate`, `server`), the runtime reservation of the `server` namespace, and the submission pipeline that this guide builds on. For the server-side contract that produces the validation payloads, see [Error and Validation Contract](../core-concepts/error-and-validation-contract).

The client normalizes this flow around {@api js:class:@arrai-innovations/vueda/utils/errors#ServerFeedbackError}. `FormValidationError` handles HTTP 400 validation responses. `ConfirmationRequiredError` handles the 409 warning-confirmation flow. Custom adapters can subclass `ServerFeedbackError` when their own blocking feedback should enter form state.

## Goal and Preconditions

The objective is a form submission flow where:

- HTTP 400 responses from the server are parsed into field-keyed and non-field feedback that appears in the correct form fields.
- Server warnings (advisory) are visually distinguished from server errors (blocking) and gate the save behind a confirmation rather than failing it.
- Blurring a field clears stale server feedback for that field and any configured dependents.
- Local validation errors (required, custom validate) block submission, but server-only errors allow resubmission so the server can re-evaluate.
- Non-field errors are rendered at the form level and participate in first-error scroll navigation.

Before you begin, ensure the following are in place:

The form uses `useForm` to create a form context and `useField` for each field (or a VUEDA field component that calls `useField` internally). The API endpoint follows VUEDA's server contract: validation failures return HTTP 400 with a payload that `VuedaValidationError` produces, and advisory warnings are surfaced through the warning confirmation gate: the serializer's `get_warnings()` hook for create/update, the viewset-level hook and helpers for deletes, activate/deactivate, and custom actions (see [Warnings That Require Confirmation](#warnings-that-require-confirmation)). For standard CRUDL surfaces, `useObjectForm` provides the default submission pipeline described below. For custom forms, you will wire the equivalent logic manually.

## Request-Boundary Error Normalization

VUEDA's client CRUDL adapters (`objectCrud`, `listCrud`) and action form components (`ModelActionForm`) classify HTTP responses at the request boundary. They wrap HTTP 400 responses in `FormValidationError`, which extends `ServerFeedbackError`. All other failure statuses produce `FetchError` or resolver-specific error types. Those types do not participate in form-context mapping unless an adapter deliberately throws a `ServerFeedbackError` subclass.

This classification is automatic for standard CRUDL operations (create, update, partial update, bulk delete) and model action execution. If you write a custom fetch wrapper for a non-standard endpoint, you must preserve this mapping:

```js
const response = await fetch(url, options);
const responseData = await response.json();
if (response.status === 400) {
  throw new FormValidationError(responseData, response);
}
if (!response.ok) {
  throw new FetchError("Request failed", response, responseData);
}
return responseData;
```

The distinction matters because only `ServerFeedbackError` instances are eligible for the form-context ingestion path. If code wraps a validation-shaped response in `FetchError` instead, it will surface through generic error handling. The form feedback will remain empty. `ConfirmationRequiredError` also extends `ServerFeedbackError`, but callers route that class through the confirmation controller instead of the generic blocking-feedback branch.

## Form-Context Error and Message Mapping

The form context ingests `ServerFeedbackError` via `handleServerFormValidationError(error)`. This method reads two maps off the error and writes each entry under the `server` code:

- `error.errors` → `state.errors[fieldPath].server`
- `error.messages` → `state.messages[fieldPath].server`

`FormValidationError` (parsed from a 400 response) only ever populates `.errors`; its `.messages` is empty. Advisory warnings instead arrive through `ConfirmationRequiredError` (parsed from a 409 response). That class populates `.messages` directly from that response's `warnings` mapping.

For standard CRUDL forms using `useObjectForm`, ingestion is automatic. `defaultOnSubmissionError` calls `handleServerFormValidationError` when the caught error is an ingestible `ServerFeedbackError` and not a `ConfirmationRequiredError`. For custom forms, call it explicitly in your error handler. Route `ConfirmationRequiredError` first when the form supports warning confirmation, or exclude it from the generic branch:

```js
import { ConfirmationRequiredError, ServerFeedbackError } from "@vueda/utils/errors.js";

try {
  await submitFn(formContext.state.submittingValues);
} catch (error) {
  if (error instanceof ServerFeedbackError && !(error instanceof ConfirmationRequiredError)) {
    formContext.handleServerFormValidationError(error);
    return;
  }
  throw error;
}
```

For forms that need pre-submission gating with the same server/non-server distinction (for example, a login form that does not use `useObjectForm`), the pattern is:

```js
if (formContext.state.anyError) {
  const nonServerErrors = Object.entries(formContext.state.errors)
    .map(([k, v]) => [k, omit(v, "server")])
    .filter(([, v]) => !isEmpty(v));
  if (nonServerErrors.length) return;
}
try {
  await submitFn(formContext.state.values);
} catch (error) {
  if (error instanceof ServerFeedbackError && !(error instanceof ConfirmationRequiredError)) {
    formContext.handleServerFormValidationError(error);
    return;
  }
  throw error;
}
```

This checks for non-server errors first (blocking), allows submission if only server errors remain (retryable), and then ingests any new server errors from the response.

## Blur and Retry Behavior

Server errors persist in form state until explicitly cleared. The clearing mechanism is field blur: when a user edits a field and leaves it, `FieldContext.blur()` calls `clearServerErrors(name, clearServerErrorDependents)` on the form context. This deletes the `server` code from both `state.errors[name]` and `state.messages[name]`, and clears the dependent paths passed to that call.

For fields with cross-field server validation (where the server error on one field is caused by the combination of multiple field values), configure `clearServerErrorDependents` on the field that should trigger clearing. The `$parent` placeholder resolves to the dot-delimited parent of the current field's path, which is useful for nested fields in array items:

```js
const fieldProps = {
    "line_items.sku": {
        validationDependencies: ["$parent.product", "$parent.quantity"],
        clearServerErrorDependents: ["$parent.quantity", "$parent.price"],
    },
};
```

In this example, blurring the `sku` field within a line item clears server errors on the `quantity` and `price` fields of the same line item. The `$parent` placeholder is replaced with the actual parent path at runtime (e.g., `line_items[2]`), so the clearing targets the correct array element.

## Non-Field and Field Feedback Rendering

Non-field errors; server validation that is not associated with a specific field; arrive under the key `non_field_errors` (the DRF convention, preserved as `NON_FIELD_ERRORS_KEY` on the client). These are rendered by `FormMessage` placed inside the form context. Multiple messages collapse into a single Alert containing a list, rather than a stack of individual Alerts:

```vue
<form @submit.prevent="submit">
  <form-message type="error" />
  <form-message type="message" />
  <!-- field components -->
</form>
```

Field-level feedback is rendered automatically by `FormField` via `FieldMessage` (a muted line under the control). The same `FormField` also renders help text via `FieldDescription`, so a typical field requires no explicit feedback elements:

```vue
<form-field name="email" label="Email" required>
  <form-label>
    <widget-input />
  </form-label>
</form-field>
```

### Structured Feedback Objects

Most feedback entries are plain strings. When a single message needs to carry structured payload (e.g. a list of offending rows that should render as a bullet list), the server may emit an object instead of a string:

```python
raise VuedaValidationError(
    {
        "non_field_errors": [
            {
                "detail": "Some rows are invalid:",
                "rows": rows,
            }
        ]
    }
)
```

The default `FormMessage` renderer has no opinion on object shape: it iterates the object's entries and renders each as a `name: value` line. That fallback is rarely what you want for a structured payload, so the expectation is that consumers override `FormMessage`'s default slot with a purpose-built component that pattern-matches on the shape and renders it appropriately:

```vue
<form-message type="error">
  <template #default="{ message }">
    <template v-if="message && typeof message === 'object' && Array.isArray(message.rows)">
      <p>{{ message.detail }}</p>
      <ul>
        <li v-for="row in message.rows" :key="row">{{ row }}</li>
      </ul>
    </template>
    <template v-else>{{ message }}</template>
  </template>
</form-message>
```

Each shape gets its own renderer. This keeps the formatting next to the UI and avoids stringly typed template payloads on the wire.

## Server Contract Expectations

For the validation pipeline to work correctly, the server must follow these conventions:

**Use `VuedaValidationError` for validation failures.** This exception normalizes scalar details into `list` form, preserves dict/list structures recursively, and ensures the response is parseable by `FormValidationError` on the client. Standard DRF `ValidationError` also works for simple cases, but `VuedaValidationError` handles structured payloads.

**Use `get_warnings()` for advisory, confirm-before-save feedback.** Override `get_warnings()` on the serializer (see the next section) to gate the save behind an explicit confirmation rather than failing it outright.

**Prefer field-keyed payloads over aggregate strings.** A payload like `{"quantity": ["Must be positive"]}` maps to a specific field in the form. A payload like `{"detail": "Invalid request"}` maps to nothing and produces opaque feedback. For bulk actions, prefer `{pk: {field: [errors]}}` style maps so correction context stays per-object.

**Keep `non_field_errors` for cross-field validation.** DRF's exception handler rewrites top-level list errors into `{non_field_errors: [...]}`. The client expects this key and renders it at the form level, not at any specific field.

**Render structured feedback objects client-side.** Object-valued feedback entries do not have a wire-format template contract. The default renderer falls back to a `name: value` line per entry. If you emit structured objects, plan to render them with a purpose-built component that overrides `FormMessage`'s default slot and matches on the shape; see the structured feedback example above.

## Warnings That Require Confirmation

Use a warning when a create or update should succeed but the user ought to acknowledge something first (for example, "this will deactivate the last administrator"). Unlike a validation error, a warning does not fail the request; it pauses it for confirmation.

**Server: override `get_warnings()`.** On the serializer, return advisory messages keyed by field (use `non_field_errors` for form-level):

```python
class WidgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Widget
        fields = ["id", "name", "count"] + VuedaSerializer.Meta.fields

    def get_warnings(self):
        warnings = {}
        if self.validated_data.get("count", 0) < 0:
            warnings["count"] = ["A negative count is unusual."]
        return warnings
```

`get_warnings()` runs after validation succeeds, so `self.validated_data` and (on update) `self.instance` are available. It must not raise; blocking conditions belong in `validate()`. When it returns warnings that the request has not acknowledged, `VuedaViewSet` withholds the write and responds `409 Conflict` with `{"confirmation_required": true, "digest": ..., "warnings": {...}}`.

**Client: confirm, then resubmit.** The create/update adaptor raises `ConfirmationRequiredError` on the 409. `useObjectForm` renders the warnings into `state.messages`, opens its `confirmation` controller, and (for `ViewCreate` and `ViewUpdate`) shows a `FormConfirmDialog`. Confirming resubmits once with the `Acknowledge-Warnings` header set to the response `digest`, which the server matches to let the write proceed; cancelling leaves the form unsaved with the warnings visible. A custom shell that calls `useObjectForm` directly should render a dialog bound to `objectForm.confirmation`, or override the `onSubmissionWarningsRequireConfirmation` hook. A custom dialog must call `confirmation.register()` on mount and `confirmation.unregister()` on unmount (`FormConfirmDialog` does this itself); when no dialog is registered, a warned save fails closed: it resolves as cancelled, the warnings stay rendered on the fields, and a console warning identifies the missing dialog.

**Server: gate destroy, activate, and deactivate with the viewset hooks.** These writes have no per-object serializer, so warnings come from the viewset instead, split across two hooks provided by {@api py:class:vueda.core.viewsets.WarningConfirmationMixin} (so any `VuedaViewSet`); `action` is the action name (`"destroy"`, `"activate"`, or `"deactivate"`) in both. Override `get_warnings_for_object(action, obj)` for a single object:

```python
class WidgetViewSet(VuedaViewSet):
    serializer_class = WidgetSerializer

    def get_warnings_for_object(self, action, obj):
        if action == "destroy" and obj.is_published:
            return {"non_field_errors": ["Published widgets disappear from the storefront when deleted."]}
        return {}
```

Overriding only `get_warnings_for_object` gates both the single-object and bulk forms of `destroy` with the same rule. It's called directly for a single-object request, and its return value is used as the aggregate `{field: [messages]}` shape as-is. For a bulk request, the default `get_warnings(action, objs)` — also provided by `WarningConfirmationMixin`, where `objs` is a queryset — calls `get_warnings_for_object` once per instance and keys each non-empty result by `str(pk)`, building `{object_id: {field: [messages]}}` so `ModelActionForm` can attribute each warning back to its object. Both variants call their hook after the action's own validation and before the write. Bulk gating is all-or-nothing: a 409 blocks the whole batch, and confirming runs all of it.

Override `get_warnings` itself instead when bulk needs different or bulk-optimized logic — for example, one query against the queryset instead of one check per instance:

```python
    def get_warnings(self, action, objs):
        if action != "destroy":
            return {}
        message = "Published widgets disappear from the storefront when deleted."
        return {str(pk): {"non_field_errors": [message]} for pk in objs.filter(is_published=True).values_list("pk", flat=True)}
```

A targetless custom action has no queryset and no single instance for either hook to key by; it calls `gate_warnings` directly from the action body instead (see the custom action example below), rather than overriding either hook here.

**Server: gate a workflow transition with `get_transition_warnings`.** Workflow transitions have no serializer either, so they use a model-level hook next to `allow_transition`. Override `get_transition_warnings(transition, user=None)` on a model using {@api py:class:vueda.workflow.models.HasWorkflowModelMixin}:

```python
class Order(HasWorkflowModelMixin, models.Model):
    def get_transition_warnings(self, transition, user=None):
        if transition.code == "cancel" and self.paid:
            return {"non_field_errors": ["Cancelling a paid order issues a refund."]}
        return {}
```

`WorkflowViewSet.execute_transition` evaluates the hook (via `check_transition`, which validates permission and availability without writing) before applying the transition, for both the single-object and bulk (`object_ids`) request forms. Bulk gating collects warnings across every instance in the batch and gates once with one digest, the same all-or-nothing contract as bulk destroy: a 409 blocks the whole batch, and confirming applies all of it. Transition authorization and error behavior (permission checks, `InvalidTransitionError`, locking, dry-run) are unchanged; the warning gate only adds a step before the write.

The bulk `warnings` shape is `{object_id: {field: [messages]}}` rather than the single-object `{field: [messages]}` mapping — `get_transition_warnings` is called once per instance (mirroring `allow_transition`), and `WorkflowViewSet.execute_transition` keeps each instance's own result nested under its object id instead of flattening it, the `{pk: {field: [errors]}}` shape recommended above for bulk action feedback. A single-object transition's warnings stay the plain aggregate shape, since there's no object to key by.

`get_transition_warnings` follows the same pattern as `get_warnings_for_object` above: both are single-instance hooks that only ever return that one instance's own `{field: [messages]}` mapping, and never decide single-vs-bulk shape themselves. The framework does that instead — `WorkflowViewSet.execute_transition` nests each instance's result under its object id to build the bulk mapping, the same way the default `get_warnings(action, objs)` calls `get_warnings_for_object` once per instance and keys the result.

**Server: gate a custom action body.** Custom `@action` bodies write directly, so they call the gate explicitly. Call `gate_warnings(request, warnings)` (from {@api py:module:vueda.core.exceptions}) after `serializer.is_valid(raise_exception=True)`, so blocking errors return 400 before the 409, and before any write or side effect:

```python
from vueda.core.decorators import action
from vueda.core.exceptions import gate_warnings


class InvoiceViewSet(VuedaViewSet):
    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        invoice = self.get_object()
        serializer = SendInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # blocking errors 400 before the gate
        warnings = {}
        if invoice.customer.balance_overdue:
            warnings["non_field_errors"] = ["This customer has an overdue balance."]
        gate_warnings(request, warnings)
        # Past the gate: there were no warnings, or the user confirmed them.
        invoice.send()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

`send` is `detail=True`, so it only ever affects one invoice and the aggregate shape above is correct as written. `gate_warnings` accepts one of two shapes, the same split `get_warnings_for_object`/`get_warnings` above use: the aggregate `{field: [messages]}` shape for a write affecting one object, or `{object_id: {field: [messages]}}` for bulk. A warning with no object to attribute it to at all, for example a targetless custom action, should still use the aggregate shape, typically `{"non_field_errors": [...]}`. `gate_warnings` itself does not enforce this (it only checks `warnings` for truthiness), but a caller that returns anything else must supply its own client-side rendering to interpret it, since the default rendering expects one of these two shapes.

**Server: always confirm an input-less action.** For a consequence action that takes no input, declare `@action(confirm=True)`. The first unacknowledged submit returns 409 without executing the body. The message comes from a `confirm_message` attribute set on the action function, with a framework default ("This action requires confirmation.") when unset:

```python
class InvoiceViewSet(VuedaViewSet):
    @action(detail=True, methods=["post"], confirm=True)
    def reissue(self, request, pk=None):
        ...

    reissue.confirm_message = "Reissuing voids the original invoice."
```

Because `confirm=True` gates before the body runs, any body-level validation error would only surface after the user confirms; actions that take input should call `gate_warnings` explicitly after validation instead.

**Author warnings from pre-write state only.** A warning is a consent question, so it must be computable from the submitted input plus the current database state, before the write; every gate raises before anything is written. A condition you can only discover by performing the write (a protected foreign key, a constraint violation) is an error that aborts the transaction, not a warning. One write path is not gated: bulk/list-serializer create and update saves.

**Client: actions and deletes confirm turnkey.** `useActionForm` handles the 409 the same way `useObjectForm` does: `useModelAction` through `ModelActionForm`, and `defaultObjectsDelete` for direct bulk-delete adapters, raise `ConfirmationRequiredError`; the `confirmation` controller prompts, and a confirmed action reruns once with the `Acknowledge-Warnings` header set. Unlike object forms, `ActionForm` mounts the `FormConfirmDialog` itself, so `ViewAction`, `ViewDestroy`, and custom shells built on `ActionForm` need no extra markup for the confirm/cancel flow to work; rendering the warnings themselves is still the consumer's responsibility (see below). Only callers that use `useActionForm` without the `ActionForm` shell must render a dialog bound to the returned `confirmation` controller (or override its `onSubmissionWarningsRequireConfirmation` hook); without one, warned actions fail closed as cancelled with a console warning.

**Client: workflow transitions confirm the same way.** `storeWorkflow.executeTransition` maps a 409 to `ConfirmationRequiredError` and accepts an `acknowledgeWarnings` argument that it sends as the `Acknowledge-Warnings` header on a confirmed retry.

**Client: the response reports its own shape, so a consumer never has to guess it.** A `warnings` mapping alone is ambiguous JSON — nothing in `{"9": {"count": [...]}}` marks it as per-object rather than a field literally named `9`. `ConfirmationRequiredError` resolves that ambiguity with a `bulk` property: `true` for the per-object shape, `false` for the aggregate shape. This is not parsed from the response body; it is set by whichever client call constructed the error, since that call is the only place that knows which request path it took — `objectCrud`'s single-object adaptors always report `false`, `listCrud`'s bulk adaptors always report `true`, and `storeWorkflow.executeTransition` reports `Array.isArray(objectPk)` (`true` even for a one-item array, because that request still went through the bulk `object_ids` path). `bulk` flows alongside `messages` through `useConfirmationController`'s `request(messages, { bulk })` into `confirmation.bulk`, and out through `FormConfirmDialog`'s `warnings` slot scope (`{ warnings, flatWarnings, bulk }`).

**Client: rendering warnings is the consuming view's job, not `FormConfirmDialog`'s.** `FormConfirmDialog`'s default `warnings` slot content has no opinion about the mapping's shape: it flattens every value into a plain list of messages, whether the mapping is field-keyed, or object-id-keyed. It never resolves a field name or an object id into anything meaningful — a view that wants shape-aware rendering overrides the `warnings` slot itself, reading `bulk` from that same slot scope to know which shape it received.

{@api vue:component:FieldWarningsList} renders the one shape every warnings source above produces for a single object: `{field: [messages]}`, with `non_field_errors` first as a plain, unlabeled list, then each other field either inline (`field: message`) for a single message or as its own sub-header plus list for more than one. It has no notion of object identity; it only ever renders one object's field-keyed warnings.

- `ViewCreate` and `ViewUpdate` are always single-object, so they override `FormConfirmDialog`'s `warnings` slot to render `FieldWarningsList` directly:

    ```vue
    <form-confirm-dialog :controller="objectForm.confirmation">
      <template #warnings="{ warnings }">
        <field-warnings-list :messages="warnings" />
      </template>
    </form-confirm-dialog>
    ```

- `ActionForm` renders no warnings content of its own — it only exposes a `form-confirm-dialog-warnings` slot that forwards `FormConfirmDialog`'s `warnings` scope (`warnings` and `bulk`), so a bare `ActionForm` consumer must supply that slot to show anything.
- `ModelActionForm` supplies that slot to handle the bulk case: it normalizes `warnings` into one group per warned object when the slot's `bulk` flag is `true` (a bulk action's warnings are keyed by object id), or the one, unkeyed group when `bulk` is `false` (a single-object action's warnings). It reads `bulk` from the slot scope — sourced from the `ConfirmationRequiredError` that reported the response. Once grouped, it resolves each object id to a display label via the model config and fetched objects, and renders each group's own field-keyed warnings through the same `FieldWarningsList`.

Each layer only understands the shape it owns: `FormConfirmDialog` doesn't know about fields or objects, `FieldWarningsList` doesn't know about objects, and only `ModelActionForm` resolves object identity, because it is the only layer with the model config and fetched objects needed to do so.

## Verification Checklist

With the validation pipeline wired, verify these behaviors:

- Submitting a form with invalid data produces field-level error messages under the correct fields.
- Non-field errors appear at the form level (above or below the field list, depending on `FormMessage` placement).
- Blurring a field that had a server error clears the error message.
- After clearing a server error by blur, resubmitting sends the request (server-only errors do not block).
- Local validation errors (required fields left empty, custom validate failures) block submission with a "Pre-save Validation Failed" toast.
- A serializer that returns `get_warnings()` produces a 409 that opens the confirmation dialog; confirming saves, cancelling does not.
- A viewset `get_warnings_for_object`/`get_warnings` override, a `gate_warnings` call in a custom action body, or `@action(confirm=True)` produces the same 409 confirm flow on delete, activate/deactivate, and action views (the dialog comes from `ActionForm`, no extra markup needed).
- A `get_transition_warnings` override produces the same 409 confirmation flow, for both a single transition and a bulk transition (one aggregate digest, no partial writes before acknowledgement).
- Structured non-field error objects render through `FormMessage`'s default slot override (or, without an override, as `name: value` fallback lines).
- The first-error scroll navigates to `non_field_errors` first, then to the first displayed field with an error.

## Troubleshooting

**Form feedback is empty after a failed request.** The most common cause is a non-400 HTTP status. Only 400 responses are parsed as `FormValidationError`. Check the network response status; a 500 from an unhandled exception or a 403 from a permission check will produce a `FetchError` that bypasses form-context mapping entirely.

**Server errors do not clear after editing a field.** `clearServerErrors` is triggered by blur, not by value change. If the user edits the field without leaving it (or if the value is changed programmatically), the `server` code persists. Verify that the field component calls `FieldContext.blur()` on the appropriate DOM event.

**Custom submit handler does not block on local errors.** If you are writing a custom submit guard (not using `useObjectForm`), ensure you call `formContext.setAllTouched()` and `await nextTick()` before checking `state.anyError`. Without these, required-field and custom validation watchers may not have fired yet.

**Bulk action errors show as a single opaque message.** If the server returns a single aggregate error string for a bulk operation (instead of per-pk field-keyed errors), the client has no way to route the feedback to specific objects. Prefer `{pk: {field: [errors]}}` style maps from bulk action endpoints.

**The confirmation dialog never appears.** Confirm the server release implements the warning gate (responds 409, not 200/400), that the warnings source (serializer `get_warnings()`, viewset `get_warnings_for_object`/`get_warnings`, or a `gate_warnings` call) actually returns a non-empty mapping for the input, and that a `FormConfirmDialog` is bound to the confirmation controller. For object forms, the view shell renders the dialog (`ViewCreate` and `ViewUpdate` do; custom `useObjectForm` shells must add it themselves). For action and destroy views, `ActionForm` mounts the dialog itself; only standalone `useActionForm` callers must add one. When no dialog is registered on the controller, the submission resolves as cancelled and a console warning names the missing dialog; check the browser console.

**Custom delete wrapper surfaces false failures.** If your endpoint uses a non-standard success status code (something other than 204 for delete), the default CRUDL wrapper may interpret the response as a failure. Adapt the wrapper to recognize the endpoint's success codes while preserving the `400 → FormValidationError` mapping.

**A bulk action's per-object warnings render as one flat, unlabeled group.** This means the `ConfirmationRequiredError` behind the confirmation reported `bulk: false` for a response that was actually the per-object shape. A custom `run-action` that issues its own bulk request must construct its `ConfirmationRequiredError` with `{ bulk: true }` itself — `ModelActionForm` reads `bulk` from that error (via `confirmation.bulk` and `FormConfirmDialog`'s `warnings` slot scope), not from its own selection count, so a one-object bulk request needs this set explicitly rather than left to default to `false`.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.core.exceptions}
    - {@api py:class:vueda.core.exceptions.VuedaValidationError}
    - {@api py:function:vueda.core.exceptions.debug_stack_exception_handler}
    - {@api py:class:vueda.core.viewsets.VuedaViewSet}
    - {@api py:class:vueda.core.viewsets.WarningConfirmationMixin}
    - {@api py:module:vueda.core.decorators}
    - {@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/utils/errors}
    - {@api js:class:@arrai-innovations/vueda/utils/errors#ServerFeedbackError}
    - {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}
    - {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}
    - {@api js:property:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError.bulk}
    - {@api js:module:@arrai-innovations/vueda/use/useForm}
    - {@api js:module:@arrai-innovations/vueda/use/useField}
    - {@api js:module:@arrai-innovations/vueda/use/useObjectForm}
    - {@api js:module:@arrai-innovations/vueda/use/useActionForm}
    - {@api js:module:@arrai-innovations/vueda/use/useConfirmationController}
    - {@api js:module:@arrai-innovations/vueda/utils/objectCrud}
    - {@api js:module:@arrai-innovations/vueda/utils/listCrud}
    - {@api js:module:@arrai-innovations/vueda/stores/storeWorkflow}
    - {@api js:property:@arrai-innovations/vueda/utils/constants#NON_FIELD_ERRORS_KEY}
- Vue.js Components:
    - {@api vue:component:ActionForm}
    - {@api vue:component:ModelActionForm}
    - {@api vue:component:FormConfirmDialog}
    - {@api vue:component:FormMessage}
    - {@api vue:component:FieldMessage}
    - {@api vue:component:FieldDescription}
