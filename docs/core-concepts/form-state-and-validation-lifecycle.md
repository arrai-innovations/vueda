---
title: Form State and Validation Lifecycle
type: explanation
audience: integrator
status: draft
---

# Form State and Validation Lifecycle

VUEDA manages form state through a two-layer context system: a form-level context that holds all values, errors, messages, and interaction state, and a field-level context that bridges individual fields into that shared state. Validation enters the state model through two distinct channels; local validation and server validation; and the system is designed so that the two never collide or overwrite each other. This behavior is centered on {@api js:module:@arrai-innovations/vueda/use/useForm} and {@api js:module:@arrai-innovations/vueda/use/useField}, which together define the user-facing {@term Client Affordance} for form feedback and submission gating.

This page explains the state model, the lifecycle transitions that mutate it, and the submission-gating semantics that determine when a form is allowed to submit. For the server-side contract that produces the validation payloads the client ingests, see [Error and Validation Contract](./error-and-validation-contract). For practical steps on wiring validation into forms, see [Handle Form Validation and Server Errors](../guides/form-validation-and-errors).

## System Boundary and Authority

The form state system lives entirely on the client. The server owns data integrity and validation rules; the client owns the runtime representation of form values, validation feedback, and interaction tracking. The boundary between them is the HTTP response: the server returns validation payloads, and the client ingests them into a state model that is structurally separate from local validation.

`useForm` creates and provides the form context. `useField` creates and provides the field context. Both use Vue's provide/inject mechanism with symbol keys (`FormContextSymbol`, `FieldContextSymbol`), making them available to any descendant component without explicit prop threading. The feedback renderers split by scope: `FormMessage` injects form context and renders non-field validation as an Alert; `FieldMessage` (rendered automatically by `FormField`) consumes field context and renders field-level validation as an inline muted line.

## Form Context State Shape

The form context, created by `useForm`, is a single reactive object with six state groups. All downstream consumers; field components, submit wrappers, feedback renderers; read from and mutate through this shared state.

**Values and initial values.** `state.values` holds the current field values. `state.initialValues` holds the baseline values used for reset and modification tracking. Both are mutated in-place using `assignReactiveObject`; they are never replaced with new objects, because doing so would break existing reactive references held by field components. When `initialValues` changes on the props passed to `useForm`, the form automatically resets: `state.values` is deep-cloned from the new initial values, and all errors, messages, touched, and focus state are cleared.

**Errors and messages.** These are the two feedback channels. `state.errors` holds blocking validation feedback; `state.messages` holds non-blocking feedback (warnings). Both use the same two-dimensional structure: `state.errors[path][code] = value` and `state.messages[path][code] = value`. The `path` is a field name or a dot/bracket-delimited nested path. The `code` identifies the source: `required` and `validate` come from local validation, `server` comes from server validation ingestion. `state.anyError` and `state.anyMessage` are derived flags maintained by the mutation methods; they reflect whether any entries exist in the respective collections.

The separation between errors and messages is the mechanism that makes VUEDA's {@term Warning Channel} work. Blocking validation failures from the server are routed into `state.errors` under the `server` code. Warnings from the server, surfaced via the confirmation gate, are routed into `state.messages` under the `server` code. The submission pipeline checks only `state.errors` when deciding whether to block; a warning does not appear there because it withholds the write itself, via `409 Conflict`, before the client's own gating runs. See [Error and Validation Contract](./error-and-validation-contract) for how the server shapes these two channels on the wire.

**Touched and focused.** `state.touched` is a path-keyed boolean map tracking which fields have been blurred. `state.anyTouched` is derived from non-emptiness. `state.focused` holds the name of the currently focused field, or `null`. Local validation only activates after a field is touched, which prevents error messages from appearing on fields the user has not yet interacted with.

**Modification tracking.** `state.modified` is a computed aggregate maintained by hook registrations from field contexts. Each field registers an `isModified` hook that returns `true` when the field's current value differs from its initial value (accounting for ignore state and unset-value semantics). `state.anyModified` is derived from the aggregate. The submission pipeline uses `anyModified` to detect and optionally block no-change submissions.

**Ignored fields.** `state.ignored` is a path-keyed boolean map. Ignored fields are excluded from `state.submittingValues`, which is a computed property that omits ignored paths and compacts arrays when ignored items are array elements (bracket-keyed paths like `items[2]`). Ignored fields are also excluded from the modification check and from non-server error gating during submission.

**Mutation methods** on the form context require non-empty path names; calling any mutation method without a name throws `"No name provided"`. This is a hard runtime invariant; it catches wiring errors where a field component mounts without a `name` prop.

## Field Context Responsibilities

The field context, created by `useField`, is a per-field projection of the form context. It reads and writes through the form context's mutation methods rather than maintaining independent state. When no form context is available (the `contextless` prop is `true`, or no `FormContextSymbol` is provided), the field context falls back to a local reactive object with the same shape, enabling standalone field usage outside forms.

**Value bridging.** `state.value` is a writable computed that reads from `formContext.state.values` using the field's `name` as a lodash-style path, and writes through `formContext.updateValue`. This means nested paths like `address.city` or `items[0].sku` work without special handling; the form context stores the flat path as a key and the field context resolves it via `lodash/get` and `lodash/set`.

**Local validation.** Each field context runs two reactive watchers that write error codes into the form context:

The **required watcher** monitors four inputs: `state.required`, the `requiredMessage` prop, `state.touched`, and `state.valueRequiredViolation`. When all conditions are met (the field is required, has been touched, and the current value violates the required check), the watcher writes `errors[name].required` with the configured message. When any condition is not met, it deletes the `required` code. The required check itself is pluggable: `isRequiredViolation` defaults to treating `null`, `undefined`, `""`, `false`, and `0` as violations, and `shouldRequireFn` can override whether the field is required at all based on dependency values.

The **validate watcher** monitors `state.valid`, which is a computed that calls the `validate` prop function (if provided) with the current value and dependency values. The validate function returns `true` for valid, or a string error message for invalid. The watcher writes `errors[name].validate` with the returned message when validation fails and the field has been touched, and deletes it otherwise. The validate watcher is intentionally not `immediate`; it waits for the first reactive change to avoid triggering validation on partially-initialized fields.

**Blur and server error clearing.** When `blur()` is called on a field context, it does three things: clears focus state, sets the field as touched, and calls `clearServerErrors` on the form context for the field's name and its configured `clearServerErrorDependents`. This is the mechanism that makes server errors dismissible after user interaction; editing and blurring a field clears the stale `server` code for that field and optionally for related fields.

**Hook registration.** On mount, the field context registers hooks for `isModified`, `isRequired`, and `isValid` with the form context's reactive hook registries. These hooks feed the form-level computed aggregates (`state.modified`, `state.required`, `state.valid`). On unmount, hooks are unregistered. This lifecycle ensures that the form-level aggregates always reflect the currently mounted set of fields.

**Dependency registration.** Fields can declare `validationDependencies`; paths to other field values that the field's `shouldRequireFn` or `validate` function needs. On mount, the field context registers these paths with the form context's dependency values registry. The resolved dependency values are then available as `state.dependencyValues`, which the required and validate computeds consume.

## Local Validation Semantics

Local validation is strictly client-side. It writes error codes `required` and `validate` into `state.errors[name]`. It never writes into `state.messages`. It only activates after the field is touched.

The activation constraint is important: a freshly loaded form shows no local validation errors even if required fields are empty, because no field has been touched yet. This is by design; the submission pipeline calls `setAllTouched()` before checking errors, which forces all local validation to evaluate. The sequence is: mark all fields touched, yield to the next microtask (`await nextTick()`) so watchers fire, then check `state.anyError`.

Local validation error codes are namespaced to avoid collisions. `required` and `validate` are the only two codes that local validation writes. The `server` code is reserved for server-originated feedback and is runtime-enforced in the client: attempts to set `server` via local `updateError`/`updateMessage` paths throw an error. The only valid writer for `server` is `handleServerFormValidationError(error)`.

## Server Validation Ingestion and Clearing

Server validation enters the form state through a single method: `handleServerFormValidationError(error)`. This method takes a `FormValidationError` instance (produced by client {@term CRUDL} adapters from HTTP 400 responses) and iterates its two maps:

- `error.errors` entries are written as `state.errors[name].server`
- `error.messages` entries are written as `state.messages[name].server`

`FormValidationError` (parsed from a 400 response) only ever populates `.errors`; its `.messages` is always empty. `.messages` is instead populated by `ConfirmationRequiredError` (parsed from a 409 response), directly from that response's `warnings` mapping. Both classes expose the same `{errors, messages}` shape, which is what lets `handleServerFormValidationError` ingest either one without branching on error type. See [The Warning Channel](#the-warning-channel) below for the full 409 lifecycle.

Server errors are cleared selectively, not globally. `clearServerErrors(name, dependents)` deletes the `server` code from both `state.errors[name]` and `state.messages[name]`, then clears each dependent path provided in the same call. Dependents can use the `$parent` placeholder, which resolves to the dot-delimited parent of the current field's path; this is how nested fields in array items can clear server errors on sibling fields when one field is edited.

The clearing is triggered by field blur: `FieldContext.blur()` calls `clearServerErrors` with the field's `clearServerErrorDependents` configuration. This means server errors persist visually until the user interacts with the relevant field. Edits that do not blur (for example, programmatic value changes) do not clear server errors.

## The {@term Warning Channel}

The `state.messages` collection is the client-side representation of server warnings. Warnings are advisory: rather than failing a submission, they gate it behind an explicit confirmation, then let the same write proceed once the user accepts.

A warning is authored on the server by overriding `get_warnings()` on the serializer, which returns `{field: [messages]}` after validation succeeds. When warnings are present and the request has not acknowledged them, `VuedaViewSet` withholds the create/update and responds `409 Conflict` with `{confirmation_required, digest, warnings}` (nothing is written). On the client, the create/update adaptor raises a `ConfirmationRequiredError`; `useObjectForm` surfaces the warnings through `handleServerFormValidationError` (so they populate `state.messages[name].server`) and opens its `confirmation` controller, which `ViewCreate` and `ViewUpdate` render as a `FormConfirmDialog`. Confirming resubmits once with the `Acknowledge-Warnings` header set to the returned `digest`, which the server matches to allow the write; cancelling leaves the form unsaved with the warnings still shown. A changed warning set produces a new digest and re-prompts, so a user never commits past a warning they did not see. If nothing is bound to the controller (a custom shell that omits the dialog), the request fails closed: the save resolves as cancelled, the warnings stay rendered on the fields, and a console warning identifies the missing dialog.

The same 409 contract gates writes that do not flow through a serializer save. For `destroy`, `activate`, and `deactivate` (single-object and bulk), warnings are authored at the viewset level by overriding `get_warnings(action, objs)` on {@api py:class:vueda.core.viewsets.WarningConfirmationMixin}; `action` is the action name, `objs` is the affected instances, and the default returns `{}`. Custom action bodies opt in by calling `gate_warnings(request, warnings)` from {@api py:module:vueda.core.exceptions} after `serializer.is_valid(raise_exception=True)` and before the write, and an input-less consequence action can be declared `@action(confirm=True)` so its first unacknowledged submit always returns 409 before the body runs. On the client, `useActionForm` runs the same confirm-then-run flow as `useObjectForm`: the 409 surfaces as a `ConfirmationRequiredError`, the `confirmation` controller (both composables build it with the shared `useConfirmationController` factory) prompts, and a confirmed action is retried once with the digest acknowledged. The dialog mounting differs between the two families: object form shells render `FormConfirmDialog` themselves (`ViewCreate` and `ViewUpdate` do), while `ActionForm` mounts the dialog internally, so `ViewAction`, `ViewDestroy`, and custom `ActionForm` shells get confirmation without extra markup and the fail-closed path applies only to standalone `useActionForm` callers. Two write paths are not gated: bulk/list-serializer create and update saves (a `ListSerializer` has no `get_warnings`), and workflow transitions.

Warnings are pre-write by definition. A warning is a consent question, and consent precedes the act, so every warning must be computable from the submitted input plus current database state, before anything is written. Every gate raises before the write, which is why a 409 never commits. Conditions discoverable only by performing the write (a protected foreign key, a constraint violation, a failure inside an action body) are errors that abort the transaction, not warnings. A post-consent error, where the user confirms and the write then fails, is possible but rare and harmless: nothing commits, and the failure surfaces through normal error handling.

`FormMessage` renders warnings when used with `type="message"`, switching the underlying Alert to the `warning` variant (yellow) instead of `destructive` (red). For field-scope warnings, `FormField` automatically pairs an error `FieldMessage` with a `severity="warning"` `FieldMessage` for `state.messages`, so per-field warnings appear under the control without additional markup.

Warnings do not participate in the client's pre-submit gating. The `defaultOnSubmitAnyError` function in `useObjectForm` checks only `state.errors`, stripping the `server` code to determine if blocking errors remain. `state.messages` is not consulted, so the submission proceeds to the server, which is where the confirmation gate lives.

## Ignored Fields and Submitting Values

`state.submittingValues` is a computed property that derives the payload to send to the server from `state.values` by removing ignored fields. The omission logic handles two cases:

For flat field paths, the ignored field is simply omitted via `lodash/omit`. For bracket-keyed array item paths (matching the pattern `...[digits]`), the ignored item is omitted and the parent array is compacted using `lodash/compact` to remove the resulting `undefined` hole. This means ignoring `items[2]` in a five-element array produces a four-element array without gaps.

The submission pipeline uses `state.submittingValues`, not `state.values`, as the payload for create and `update` operations. The default error-gating logic also accounts for ignored fields: when checking for non-server errors, it filters out errors whose keys match or are children of ignored field paths (using `.` as the separator for child-path detection).

## Submission Gating Semantics

The default submission pipeline, implemented in `useObjectForm`, follows a fixed sequence:

1. Set `loading` state immediately (disables the submit button).
2. Call `setAllTouched()` to activate all local validation.
3. `await nextTick()` to let validation watchers fire.
4. Check `anyModified`. If the form has no changes, call `onSubmitNotAnyModified`; by default this shows a "No Changes Detected" toast and stops submission.
5. Check `anyError`. If errors exist, call `onSubmitAnyError`; by default this filters ignored fields, strips the `server` code from remaining errors, and if non-server errors remain, shows a "Pre-save Validation Failed" toast, scrolls to the first error field, and stops submission. If only `server` errors remain, submission proceeds (the user is retrying after server feedback).
6. Execute the create or `update` operation.
7. If the operation fails with a `FormValidationError`, call `onSubmissionError`; by default this ingests the error into form state and scrolls to the first error field.
8. If the operation succeeds, call `onSubmissionSuccess`; by default this shows a success toast and redirects.

Each step in this sequence (`onSubmitNotAnyModified`, `onSubmitAnyError`, `onSubmissionError`, `onSubmissionSuccess`) is a replaceable hook on the `useObjectForm` return object. Projects can override individual hooks without forking the entire submission pipeline.

The server-error retry behavior is the most significant design decision in this pipeline. After a failed submission that produced server errors, the user edits a field and blurs it. The blur clears the `server` code for that field. If the remaining errors are only `server` codes on other fields (not yet blurred), the pipeline allows resubmission so the server can re-evaluate. This prevents server errors from permanently blocking a form without requiring the user to blur every field that had a server error.

## Non-Field and Structured Feedback Rendering

Non-field feedback; validation messages that are not associated with a specific field; uses the stable key `non_field_errors` (defined as `NON_FIELD_ERRORS_KEY`). This key originates from the server, where DRF's exception handler rewrites top-level list errors into `{non_field_errors: [...]}`, and is preserved as a contract constant on the client.

Two components render this state. `FormMessage` is form-scope: placed inside a form context, it reads `formContext.state.errors[NON_FIELD_ERRORS_KEY]` (or `.messages[NON_FIELD_ERRORS_KEY]` when `type="message"`) and renders a single Alert containing the messages, listed when there is more than one. `FieldMessage` is field-scope: rendered automatically by `FormField` against `fieldContext.state.errors` and `.messages`, it produces a muted line of text under the control rather than an Alert.

Structured feedback objects (where a server error entry is an object rather than a string) have no wire-format template contract. The default `FormMessage` renderer iterates the object's entries and emits one `name: value` line per entry as a fallback. Consumers that need richer rendering override `FormMessage`'s default slot with a purpose-built component that pattern-matches on the object's shape; see [Handle Form Validation and Server Errors](../guides/form-validation-and-errors) for the pattern.

`getFirstErrorField` supports non-field errors in its priority ordering. It prepends `NON_FIELD_ERRORS_KEY` to the display fields list before searching, so non-field errors are always found first. For array fields, it searches bracket-keyed error paths (`field[0]`, `field[1]`, etc.). For fields expressed with `__`-delimited nesting (a display convention), it resolves the parent array and searches nested keys within array items.

## Observable Failure Signatures

**Stale server errors after editing without blur.** Server errors and messages persist until `clearServerErrors` is triggered by blur. If a value is changed programmatically or the user edits without leaving the field, the `server` code remains visible. The form may still submit (server errors are retryable), but the stale feedback can confuse users.

**No transitive dependent traversal.** `clearServerErrors` clears only the field and the dependent paths passed to that call. It does not read dependents from those dependent fields and continue traversing a graph.

**Ignored array items not matching bracket-keyed errors.** Ignoring a base array field name (e.g., `items`) does not automatically ignore bracket-keyed error paths under it (e.g., `items[0].quantity`). The submission gating logic matches ignored prefixes using `.` separators, so `items` matches `items.something` but not `items[0].something`. This can leave the form blocked by errors on fields the developer intended to ignore.

**Non-400 responses bypassing form feedback.** Only HTTP 400 responses are parsed as `FormValidationError`. A server endpoint that returns a validation-shaped payload with a different status code (for example, a 500 from an unhandled exception) will not populate form-context errors. The form feedback remains empty while the error surfaces through generic error handling.

**Reserved-code violation (`server`).** Local attempts to write the `server` code now throw immediately. The typical signature is: `Error code "server" is reserved for server-originated validation and cannot be set from local validation...`. This protects submission gating semantics by preventing local validation from entering the retryable server namespace.

## Relevant Implementation Surface

- {@api js:module:@arrai-innovations/vueda/use/useForm}
- {@api js:module:@arrai-innovations/vueda/use/useField}
- {@api js:module:@arrai-innovations/vueda/use/useObjectForm}
- {@api js:module:@arrai-innovations/vueda/use/useActionForm}
- {@api js:module:@arrai-innovations/vueda/utils/errors}
- {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}
- {@api js:property:@arrai-innovations/vueda/utils/constants#NON_FIELD_ERRORS_KEY}
- {@api vue:component:ActionForm}
- {@api vue:component:FormConfirmDialog}
- {@api vue:component:FormMessage}
- {@api vue:component:FieldMessage}
- {@api vue:component:FieldDescription}
