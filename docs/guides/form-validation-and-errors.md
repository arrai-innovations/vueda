---
title: Handle Form Validation and Server Errors
type: how-to
audience: implementor
status: briefing
---

# Handle Form Validation and Server Errors

## Intent and Scope

- Implement a predictable submit/error flow across object CRUD forms and action forms.
- Normalize server-side validation errors into form-context field and non-field feedback with minimal custom glue.
- Treat this page as a technical briefing (contracts, surfaces, verification points), not final tutorial prose.

## Non-goals

- Not a UX copywriting/theming guide for error presentation.
- Not a deep explanation of VUEDA architecture internals.
- Not an endpoint-by-endpoint matrix of every app-specific validation response.

## Key Tasks

### 1. Normalize 400s into `FormValidationError` at request boundaries

- Keep form-related request layers mapping `HTTP 400` to `FormValidationError`, and non-400 failures to `FetchError`.
- Preserve this mapping for object create/update/patch, bulk delete, and model action execution paths.
- Source anchors: `client/lib/utils/objectCrud.js`, `client/lib/utils/listCrud.js`, `client/lib/components/ModelActionForm.vue`, `client/tests/unit/lib/utils/objectCrud.spec.js`, `client/tests/unit/lib/components/ModelActionForm.spec.js`.

### 2. Map server validation payloads into form-context server channels

- Route `FormValidationError.errors` into `formContext.state.errors[*].server` and `FormValidationError.messages` into `formContext.state.messages[*].server`.
- Keep warning payloads representable (server-side warning details map to `messages` through `FormValidationError` parsing).
- Source anchors: `client/lib/utils/errors.js`, `client/lib/use/useForm.js`, `client/lib/use/useWarnings.js`, `client/tests/unit/lib/use/useForm.spec.js`, `server/vueda/core/exceptions.py`.

### 3. Keep field-level retry behavior clearing stale server feedback

- On blur, clear `server` error/message entries for the field and configured dependent paths.
- Use `$parent` dependent resolution where nested fields must clear related server errors together.
- Source anchors: `client/lib/use/useField.js`, `client/lib/use/useForm.js`, `client/tests/unit/lib/use/useField.spec.js`, `client/tests/unit/lib/use/useForm.spec.js`.

### 4. Gate submission on local validation but allow server re-check when appropriate

- Block submit when non-server validation errors exist.
- Allow submit retries when remaining errors are only `server` errors so users can re-check after edits.
- Source anchors: `client/lib/use/useObjectForm.js`, `client/lib/components/ActionForm.vue`, `client/tests/unit/lib/use/useObjectForm.spec.js`, `client/tests/unit/lib/components/ActionForm.spec.js`.

### 5. Preserve first-error navigation and non-field rendering behavior

- Keep first-error selection/scroll behavior wired through form-context error ordering and submit handlers.
- Ensure form-level feedback components still render non-field errors via `NON_FIELD_ERRORS_KEY`.
- Source anchors: `client/lib/use/useForm.js`, `client/lib/use/useObjectForm.js`, `client/lib/components/FormChores.vue`, `client/lib/components/FormFeedback.vue`, `client/tests/unit/lib/components/FormChores.spec.js`, `client/tests/unit/lib/components/FormFeedback.spec.js`.

### 6. Keep server validation contract compatible with client parsing assumptions

- Prefer `VuedaValidationError` for validation failures so detail structures remain parseable by client form error handlers.
- Preserve list-style validation semantics for non-field errors and structured field-keyed errors for object/bulk operations.
- Source anchors: `server/vueda/core/exceptions.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/serializers/__init__.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/logging/test_logging.py`.

### 7. Prefer portable patterns that do not depend on project-specific code

- Keep submit guards that block only non-server errors, then hand server validation back to `handleServerFormValidationError(...)`.
- Use `clearServerErrorDependents` and `$parent` dependency paths on nested/array fields so related stale server errors clear together on blur.
- For richer non-field feedback, prefer structured message objects with a `detail` template and token payload, because form feedback rendering supports object expansion.
- For bulk actions, prefer `{pk: {field: [errors]}}` style maps over a single aggregate message so correction context stays per-object.
- If your endpoint semantics differ from default CRUD wrappers (for example non-204 delete success), adapt the wrapper deliberately while preserving `400 => FormValidationError`.
- Source anchors: `client/lib/use/useObjectForm.js`, `client/lib/components/ActionForm.vue`, `client/lib/use/useField.js`, `client/tests/unit/lib/use/useField.spec.js`, `client/lib/components/FormFeedback.vue`, `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`, `client/lib/utils/listCrud.js`.

### 8. Portable implementation patterns

- Login/session form submit guard pattern:

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

- Nested field dependent-clear pattern:

```js
const fieldProps = {
  "line_items__sku": {
    validationDependencies: ["$parent.product", "$parent.quantity"],
    clearServerErrorDependents: ["$parent.quantity", "$parent.price"],
  },
};
```

- Structured non-field payload pattern:

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

- Source anchors: `client/lib/use/useObjectForm.js`, `client/lib/components/ActionForm.vue`, `client/lib/use/useField.js`, `client/tests/unit/lib/use/useField.spec.js`, `client/lib/components/FormFeedback.vue`, `server/vueda/core/exceptions.py`.

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
- `{@api js:module:@arrai-innovations/vueda.utils/objectCrud}`
- `{@api js:module:@arrai-innovations/vueda.utils/listCrud}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.NON_FIELD_ERRORS_KEY}`
- Vue.js Components:
- `{@api vue:component:ActionForm}`
- `{@api vue:component:ModelActionForm}`
- `{@api vue:component:FormChores}`
- `{@api vue:component:FormFeedback}`

## Contracts and Invariants

- Default object/action client paths treat `HTTP 400` as validation (typed `FormValidationError`), not generic request failure.
- `FormValidationError` parsing separates error vs warning channels and exposes normalized field paths for form mapping.
- Form context stores server-originated feedback under `"server"` code keys, preserving local and server validation separation.
- Field blur clears server error/message entries for that field and optional dependent paths.
- Form-level rendering expects non-field issues under `NON_FIELD_ERRORS_KEY`.
- Structured object non-field messages with `detail` plus token arrays are renderable by feedback components (template token substitution path).
- Server `VuedaValidationError` handling preserves structured validation payloads and includes `serverStack` diagnostics in responses.
- Bulk validation responses can be keyed by PK to preserve per-instance correction context in action workflows.
- Source anchors: `client/lib/utils/objectCrud.js`, `client/lib/components/ModelActionForm.vue`, `client/lib/utils/errors.js`, `client/lib/use/useForm.js`, `client/lib/use/useField.js`, `client/lib/components/FormFeedback.vue`, `server/vueda/core/exceptions.py`, `server/vueda/core/viewsets/__init__.py`, `server/tests/unit/core/test_viewsets.py`.

## Footguns

- Returning custom validation payload shapes that do not map to field paths or `non_field_errors` degrades client-side form mapping.
- Throwing `FetchError` instead of `FormValidationError` in form submission paths bypasses automatic form-context mapping.
- Custom field implementations that skip `useField.blur()` leave stale server errors/messages in form state.
- Treating all `formContext.state.anyError` cases as hard blocks can prevent valid server re-check flows after user edits.
- Returning only aggregate bulk-action error strings (without per-pk or field keys) makes client remediation flows much harder.
- Custom delete/action wrappers that do not account for endpoint-specific success codes can surface false failures.
- Source anchors: `client/lib/utils/errors.js`, `client/lib/use/useField.js`, `client/lib/use/useObjectForm.js`, `client/lib/components/ActionForm.vue`, `server/vueda/core/exceptions.py`, `client/lib/utils/listCrud.js`, `server/vueda/core/viewsets/__init__.py`.

## Suggested Outline

```md
## Goal and Preconditions
## Request-Boundary Error Normalization
## Form-Context Error/Message Mapping
## Blur and Retry Behavior
## Non-Field and Field Feedback Rendering
## Server Contract Expectations
## Verification Checklist
## Portable Implementation Patterns
## Troubleshooting
```
