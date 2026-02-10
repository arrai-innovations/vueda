---
title: Form State and Validation Lifecycle
type: explanation
audience: implementor
status: briefing
---

# Form State and Validation Lifecycle

## Intent and Scope

- Define the authoritative client runtime state model for forms (form context + field context) and the lifecycle transitions that mutate that state.
- Define where local validation and server validation enter the state model, and how they remain distinguishable.
- Define the submission-time gating semantics implemented by the default form submission surfaces.
- Source anchors: `client/lib/use/useForm.js`, `client/lib/use/useField.js`, `client/lib/use/useObjectForm.js`, `client/lib/components/ActionForm.vue`, `client/lib/utils/errors.js`, `client/lib/components/FormFeedback.vue`, `client/lib/components/FormChores.vue`.

## Non-goals

- Not a how-to for constructing concrete forms or wiring project-specific submit handlers.
- Not the server wire-format contract for validation payload shapes beyond what is required for client ingestion (see core validation contract documentation for server authority).
- Not prescriptive UX guidance for how errors/messages should be presented (only observable runtime behavior and state transitions).

## Key Concepts

### Form context (`FormContext`) is the form-state authority

- What it is: a provided/injected reactive state container (`state`) plus mutation methods for values, initial values, touched/focus, ignore, errors, and messages.
- Why it exists: consumers (fields, forms, submit wrappers, feedback renderers) share a single authoritative state shape and mutation surface.
- Where it lives: `client/lib/use/useForm.js` (state shape, mutation methods, reset/initialValues watch, server error ingestion).

### Field context (`FieldContext`) is the per-field bridge into form state

- What it is: a provided/injected per-field state/view of the form context plus local validation and blur semantics.
- Why it exists: field-level components update form state consistently (value, touched, required/validate errors, and server-error clearing) while remaining compatible with context-less operation.
- Where it lives: `client/lib/use/useField.js` (required/validate watchers, blur clears server feedback, hook registration into form aggregates, dependency registration).

### Local validation writes non-server error codes (`required`, `validate`)

- What it is: required-violation checks and optional custom validation that only produce errors after touch/blur semantics are active.
- Why it exists: local validation can block submission without conflating local issues with server-provided validation.
- Where it lives: `client/lib/use/useField.js` (required watcher writes `errors[name].required`; validate watcher writes `errors[name].validate`).

### Server validation ingestion writes server-scoped codes (`server`) into errors/messages

- What it is: a dedicated ingestion method that maps `FormValidationError.errors` into `errors[name].server` and `FormValidationError.messages` into `messages[name].server`.
- Why it exists: server feedback is preserved as a distinct channel for retry semantics and selective clearing without erasing local validation state.
- Where it lives: `client/lib/utils/errors.js` (parsing into `.errors`/`.messages`), `client/lib/use/useForm.js` (`handleServerFormValidationError`, `clearServerErrors`), `client/lib/use/useField.js` (blur triggers `clearServerErrors`).

### Submission wrappers gate on non-server validation but permit server re-check

- What it is: default submission control flow that blocks submission for non-server errors, but does not block on server-only errors (treated as retryable until rechecked).
- Why it exists: server-originated errors may be stale after edits; the default pipeline allows re-check while still preventing local validation failures from submitting.
- Where it lives: `client/lib/use/useObjectForm.js` (`defaultOnSubmitAnyError`, submit pipeline), `client/lib/components/ActionForm.vue` (non-server error gating; dry-run ingestion).

### Non-field and structured feedback are routed through a stable key and renderer assumptions

- What it is: non-field feedback uses `NON_FIELD_ERRORS_KEY` (`non_field_errors`) and is rendered by form feedback components from either form context or field context.
- Why it exists: non-field payloads and structured message objects must be renderable without field binding, and must remain distinguishable from field-keyed feedback.
- Where it lives: `client/lib/utils/constants.js`, `client/lib/components/FormFeedback.vue`, `client/lib/components/FormChores.vue`, `client/lib/use/useForm.js` (`getFirstErrorField` prioritizes non-field).

## Relevant Implementation Surface

- `{@api js:module:@arrai-innovations/vueda.use/useForm}`
- `{@api js:module:@arrai-innovations/vueda.use/useField}`
- `{@api js:module:@arrai-innovations/vueda.use/useObjectForm}`
- `{@api js:module:@arrai-innovations/vueda.utils/errors}`
- `{@api js:class:@arrai-innovations/vueda.utils/errors.FormValidationError}`
- `{@api js:property:@arrai-innovations/vueda.utils/constants.NON_FIELD_ERRORS_KEY}`
- `{@api vue:component:ActionForm}`
- `{@api vue:component:FormFeedback}`
- `{@api vue:component:FormChores}`

## Contracts and Invariants

- Form context state (`state.values`, `state.initialValues`, `state.errors`, `state.messages`, `state.touched`, `state.ignored`) is mutated in-place; `reset(...)` uses `assignReactiveObject(...)` and does not replace `state.values` or `state.initialValues`. Anchors: `client/lib/use/useForm.js`.
- Form context mutation methods require non-empty path names; missing names throw runtime errors (`"No name provided"`). Anchors: `client/lib/use/useForm.js`.
- Error/message storage is two-dimensional: `state.errors[path][code] = message` and `state.messages[path][code] = message`; `state.anyError` and `state.anyMessage` are derived from collection non-emptiness. Anchors: `client/lib/use/useForm.js`.
- `handleServerFormValidationError(...)` maps server validation into code key `server` (errors and messages remain separate channels). Anchors: `client/lib/use/useForm.js`, `client/lib/utils/errors.js`.
- `clearServerErrors(name, dependents)` deletes only `server` codes for `name` and recursively clears dependent paths, with `$parent` placeholder resolution for dot-delimited parent paths. Anchors: `client/lib/use/useForm.js`.
- Field blur (`FieldContext.blur()`) sets touched and clears server feedback (`server` codes) for the field and its configured dependents. Anchors: `client/lib/use/useField.js`, `client/lib/use/useForm.js`.
- Local required validation emits `errors[name].required` only when (required AND touched AND required-violation), and deletes it otherwise. Anchors: `client/lib/use/useField.js`.
- Local custom validation emits `errors[name].validate` only when touched and validation returns a string, and deletes it otherwise. Anchors: `client/lib/use/useField.js`.
- `state.submittingValues` omits ignored fields; if an ignored field is an array item key (`...[\d+]`), the parent array is compacted before submission. Anchors: `client/lib/use/useForm.js`, `client/lib/use/useObjectForm.js`, `client/lib/components/ActionForm.vue`.
- Default submit gating blocks on non-server errors by stripping the `server` code before determining emptiness; server-only errors do not block submission. Anchors: `client/lib/use/useObjectForm.js`, `client/tests/unit/lib/use/useObjectForm.spec.js`, `client/lib/components/ActionForm.vue`.
- `getFirstErrorField(displayFields, arrayFields)` prioritizes `NON_FIELD_ERRORS_KEY`, then displayed fields; it also searches array-item keys and nested keys derived from `__`-delimited display field names. Anchors: `client/lib/use/useForm.js`, `client/lib/views/ViewUpdate.vue`.
- `FormFeedback` renders feedback from either field context or form context non-field keys; structured object lines are rendered via a required `.detail` template string with `${token}` substitution. Anchors: `client/lib/components/FormFeedback.vue`, `client/lib/utils/constants.js`.

## Footguns

- Server-derived errors/messages persist until blur triggers `clearServerErrors(...)`; edits that do not blur can leave stale `server` codes visible. Anchors: `client/lib/use/useField.js`, `client/lib/use/useForm.js`.
- `clearServerErrors(...)` has no cycle detection across dependent paths; cyclic `clearServerErrorDependents` graphs can recurse indefinitely. Anchors: `client/lib/use/useForm.js`, `client/lib/use/useField.js`.
- Ignoring a base array field name does not imply ignoring bracket-keyed array item errors (for example `items[0].x`); default submit gating only excludes ignored-prefix matches using `.` separators. Symptoms: submission blocked by errors under ignored array items. Anchors: `client/lib/use/useObjectForm.js`, `client/lib/use/useForm.js`.
- Validation-looking failures that are not HTTP `400` are not represented as `FormValidationError` and therefore do not map into `server` codes. Symptoms: form feedback remains empty while generic error handling paths trigger. Anchors: `client/lib/utils/objectCrud.js`, `client/lib/utils/errors.js`, `client/lib/use/useForm.js`.
- Using error code key `server` for non-server validation makes default submit gating treat that validation as retryable (server-only) and may permit submission. Anchors: `client/lib/use/useObjectForm.js`, `client/lib/use/useForm.js`.
- `FormValidationError` assumes object-like response payloads (`const data = { ...responseData }`); non-object payloads can yield path flattening artifacts and opaque feedback. Anchors: `client/lib/utils/errors.js`.
- Structured feedback objects without a `.detail` property can throw at render time (`renderDetail(line)` assumes `detail.replace(...)`). Symptoms: runtime exception while rendering feedback. Anchors: `client/lib/components/FormFeedback.vue`.

## Suggested Outline

```md
## System Boundary and Authority

## Form Context State Shape

## Field Context Responsibilities

## Local Validation Semantics

## Server Validation Ingestion and Clearing

## Ignored Fields and Submitting Values

## Submission Gating Semantics

## Non-Field and Structured Feedback Rendering

## Observable Failure Signatures
```
