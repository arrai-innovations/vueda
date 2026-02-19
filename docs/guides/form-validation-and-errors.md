---
title: Handle Form Validation and Server Errors
type: how-to
audience: implementor
status: draft
---

# Handle Form Validation and Server Errors

This guide covers the end-to-end flow for getting server validation errors into form feedback, clearing them on user interaction, and gating submission on local versus server validation. It applies to both standard CRUD forms (via `useObjectForm`) and custom forms that wire their own submission logic.

The guide assumes familiarity with the form state model. If you have not read [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle), start there; it explains the two-channel state model (errors vs messages), the code-key namespacing (`required`, `validate`, `server`), the runtime reservation of the `server` namespace, and the submission pipeline that this guide builds on. For the server-side contract that produces the validation payloads, see [Error and Validation Contract](../core-concepts/error-and-validation-contract).

## Goal and Preconditions

The objective is a form submission flow where:

- HTTP 400 responses from the server are parsed into field-keyed and non-field feedback that appears in the correct form fields.
- Server warnings (non-blocking) are visually distinguished from server errors (blocking) and do not prevent submission.
- Blurring a field clears stale server feedback for that field and any configured dependents.
- Local validation errors (required, custom validate) block submission, but server-only errors allow resubmission so the server can re-evaluate.
- Non-field errors are rendered at the form level and participate in first-error scroll navigation.

Before you begin, ensure the following are in place:

The form uses `useForm` to create a form context and `useField` for each field (or a VUEDA field component that calls `useField` internally). The API endpoint follows VUEDA's server contract: validation failures return HTTP 400 with a payload that `VuedaValidationError` produces, and warnings use the `is_warning=True` flag. For standard CRUD surfaces, `useObjectForm` provides the default submission pipeline described below. For custom forms, you will wire the equivalent logic manually.

## Request-Boundary Error Normalization

VUEDA's client CRUD adapters (`objectCrud`, `listCrud`) and action form components (`ModelActionForm`) classify HTTP responses at the request boundary. HTTP 400 responses are wrapped in `FormValidationError`; all other failure statuses produce `FetchError` or resolver-specific error types that do not participate in form-context mapping.

This classification is automatic for standard CRUD operations (create, update, partial update, bulk delete) and model action execution. If you write a custom fetch wrapper for a non-standard endpoint, you must preserve this mapping:

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

The distinction matters because only `FormValidationError` instances are handled by the form-context ingestion path. If a validation-shaped response is wrapped in `FetchError` instead, it will surface through generic error handling, and the form feedback will remain empty.

## Form-Context Error and Message Mapping

When a `FormValidationError` reaches the form context (either through the default `onSubmissionError` handler or through manual handling), it is ingested via `handleServerFormValidationError(error)`. This method iterates the error's two pre-parsed maps:

- `error.errors` (non-warning paths from the server payload) → written to `state.errors[fieldPath].server`
- `error.messages` (warning paths from the server payload) → written to `state.messages[fieldPath].server`

The split happens in the `FormValidationError` constructor. It flattens the response payload into paths, then uses the regex `/\.warnings(\[\d+\])?/` to classify them. Paths containing `.warnings` (produced by the server's `VuedaValidationError(detail, is_warning=True)`) are routed to `.messages`. Everything else goes to `.errors`.

For standard CRUD forms using `useObjectForm`, the ingestion is automatic; `defaultOnSubmissionError` calls `handleServerFormValidationError` when the caught error is a `FormValidationError`. For custom forms, you must call it explicitly in your error handler:

```js
try {
  await submitFn(formContext.state.submittingValues);
} catch (error) {
  if (error instanceof FormValidationError) {
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
  if (error instanceof FormValidationError) {
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
  line_items__sku: {
    validationDependencies: ["$parent.product", "$parent.quantity"],
    clearServerErrorDependents: ["$parent.quantity", "$parent.price"],
  },
};
```

In this example, blurring the `sku` field within a line item clears server errors on the `quantity` and `price` fields of the same line item. The `$parent` placeholder is replaced with the actual parent path at runtime (e.g., `line_items[2]`), so the clearing targets the correct array element.

## Non-Field and Field Feedback Rendering

Non-field errors; server validation that is not associated with a specific field; arrive under the key `non_field_errors` (the DRF convention, preserved as `NON_FIELD_ERRORS_KEY` on the client). These are rendered by `FormFeedback` when it is inside a form context but outside a field context:

```vue
<form @submit.prevent="submit">
  <form-feedback type="error" />
  <form-feedback type="message" />
  <!-- field components -->
</form>
```

Field-level feedback is rendered by `FormFeedback` (or `FormChores`, which composes help text with error and message feedback) when inside a field context:

```vue
<field-string name="email" label="Email" required>
  <form-label>
    <widget-input />
  </form-label>
  <form-chores />
</field-string>
```

`FormChores` renders both error and message feedback for the field, using named slot conventions for customization. For non-field feedback with structured objects, the server must emit objects with a `detail` template property:

```python
raise VuedaValidationError(
    {
        "non_field_errors": [
            {
                "detail": "Some rows are invalid: ${rows}",
                "rows": rows,
            }
        ]
    }
)
```

The `FormFeedback` renderer replaces `${token}` placeholders with the corresponding properties from the object. Array-valued properties are rendered as HTML lists. This is a hard contract: structured objects without a `detail` property throw at render time, and the client does not provide a fallback renderer for them.

## Server Contract Expectations

For the validation pipeline to work correctly, the server must follow these conventions:

**Use `VuedaValidationError` for validation failures.** This exception normalizes scalar details into `list` form, preserves dict/list structures recursively, and ensures the response is parseable by `FormValidationError` on the client. Standard DRF `ValidationError` also works for simple cases, but `VuedaValidationError` handles the warning channel and structured payloads.

**Use `is_warning=True` for non-blocking feedback.** This wraps the detail in a `{"warnings": [...]}` structure that the client parser routes to `.messages` instead of `.errors`. Warning-only exceptions skip Sentry capture and database logging in production, treating them as informational rather than error-level events.

**Prefer field-keyed payloads over aggregate strings.** A payload like `{"quantity": ["Must be positive"]}` maps to a specific field in the form. A payload like `{"detail": "Invalid request"}` maps to nothing and produces opaque feedback. For bulk actions, prefer `{pk: {field: [errors]}}` style maps so correction context stays per-object.

**Keep `non_field_errors` for cross-field validation.** DRF's exception handler rewrites top-level list errors into `{non_field_errors: [...]}`. The client expects this key and renders it at the form level, not at any specific field.

**Treat structured feedback objects as contract-bound.** If you emit object-valued feedback entries, include a `detail` template string on each object. Missing `detail` is treated as invalid payload shape and causes a render-time `TypeError` in `FormFeedback`.

## Verification Checklist

With the validation pipeline wired, verify these behaviors:

- Submitting a form with invalid data produces field-level error messages under the correct fields.
- Non-field errors appear at the form level (above or below the field list, depending on `FormFeedback` placement).
- Blurring a field that had a server error clears the error message.
- After clearing a server error by blur, resubmitting sends the request (server-only errors do not block).
- Local validation errors (required fields left empty, custom validate failures) block submission with a "Pre-save Validation Failed" toast.
- Server warnings (from `is_warning=True`) appear with warning severity (yellow) and do not block submission.
- Structured non-field error objects render their `detail` template with token substitution.
- The first-error scroll navigates to `non_field_errors` first, then to the first displayed field with an error.

## Troubleshooting

**Form feedback is empty after a failed request.** The most common cause is a non-400 HTTP status. Only 400 responses are parsed as `FormValidationError`. Check the network response status; a 500 from an unhandled exception or a 403 from a permission check will produce a `FetchError` that bypasses form-context mapping entirely.

**Server errors do not clear after editing a field.** `clearServerErrors` is triggered by blur, not by value change. If the user edits the field without leaving it (or if the value is changed programmatically), the `server` code persists. Verify that the field component calls `FieldContext.blur()` on the appropriate DOM event.

**Custom submit handler does not block on local errors.** If you are writing a custom submit guard (not using `useObjectForm`), ensure you call `formContext.setAllTouched()` and `await nextTick()` before checking `state.anyError`. Without these, required-field and custom validation watchers may not have fired yet.

**Bulk action errors show as a single opaque message.** If the server returns a single aggregate error string for a bulk operation (instead of per-pk field-keyed errors), the client has no way to route the feedback to specific objects. Prefer `{pk: {field: [errors]}}` style maps from bulk action endpoints.

**Warning-only response still prevents submission.** Verify that the server is using `VuedaValidationError(detail, is_warning=True)`, not just a string with "warning" in the text. The `is_warning` flag controls the wire-format wrapping (`{"warnings": [...]}`) that the client parser uses to route to `.messages` instead of `.errors`. Without it, the payload lands in `.errors` and blocks submission.

**Custom delete wrapper surfaces false failures.** If your endpoint uses a non-standard success status code (something other than 204 for delete), the default CRUD wrapper may interpret the response as a failure. Adapt the wrapper to recognize the endpoint's success codes while preserving the `400 → FormValidationError` mapping.

## Relevant Implementation Surface

- Python:
  - `{@api py:module:vueda.core.exceptions}`
  - `{@api py:class:vueda.core.exceptions.VuedaValidationError}`
  - `{@api py:function:vueda.core.exceptions.debug_stack_exception_handler}`
  - `{@api py:class:vueda.core.viewsets.VuedaViewSet}`
  - `{@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}`
- JavaScript:
  - `{@api js:module:@arrai-innovations/vueda.utils/errors}`
  - `{@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError}`
  - `{@api js:module:@arrai-innovations/vueda.use/useForm}`
  - `{@api js:module:@arrai-innovations/vueda.use/useField}`
  - `{@api js:module:@arrai-innovations/vueda.use/useObjectForm}`
  - `{@api js:module:@arrai-innovations/vueda.use/useWarnings}`
  - `{@api js:module:@arrai-innovations/vueda.utils/objectCrud}`
  - `{@api js:module:@arrai-innovations/vueda.utils/listCrud}`
  - `{@api js:property:@arrai-innovations/vueda.utils/constants.NON_FIELD_ERRORS_KEY}`
- Vue.js Components:
  - `{@api vue:component:ActionForm}`
  - `{@api vue:component:ModelActionForm}`
  - `{@api vue:component:FormChores}`
  - `{@api vue:component:FormFeedback}`
