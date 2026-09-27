---
title: Form State and Validation Lifecycle
type: explanation
audience: integrator
status: draft
---

# Form State and Validation Lifecycle

A VUEDA form keeps its values, validation feedback, and interaction state in one {@term Form Context}. {@api js:function:@arrai-innovations/vueda/use/useForm#useForm} creates it, and each field calls {@api js:function:@arrai-innovations/vueda/use/useField#useField} to read and write it at the field's {@term Field Path}. This page describes that shared state, how local validation and {@term Server Feedback} enter it, and when a form may submit.

[Error and Validation Contract](./error-and-validation-contract) describes the response bodies the server sends and the client error classes built from them. [Handle Form Validation and Server Errors](../guides/form-validation-and-errors) gives the steps for wiring validation into a form.

## Form and Field Contexts

Form state lives on the client. It holds values, feedback, and interaction tracking between requests. The server validates every write on its own, so client validation shapes what the user sees and the server decides what is written.

`useForm` provides the form context under {@api js:property:@arrai-innovations/vueda/utils/symbols#FormContextSymbol}, and `useField` provides a field context under {@api js:property:@arrai-innovations/vueda/utils/symbols#FieldContextSymbol}. Descendant components inject them through Vue's provide and inject, so no component passes them down as props.

Two components render feedback. {@api vue:component:FormMessage} injects the form context and renders {@term Non-Field Error} messages. {@api vue:component:FormField} renders a field's errors and warnings through {@api vue:component:FieldMessage}, which receives them in its [`messages`]{@api vue:component:FieldMessage:prop:messages} prop. [Forms](../reference/components/forms) describes how both components look.

## Form Context State Shape

`useForm` builds one reactive state object and exposes it read-only as [`state`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.state}. Components change it only through the form context's methods, such as [`updateValue`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.updateValue}, [`deleteValue`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.deleteValue}, and [`clearErrors`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.clearErrors}. A method that takes a path throws `"No name provided"` when the path is empty. This catches a field mounted without a `name` prop.

**Values.** [`values`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.values} holds the current values as a nested object, so `updateValue("address.city", value)` writes `values.address.city`. [`initialValues`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.initialValues} holds the baseline for reset and modification tracking. VUEDA updates both objects in place and never replaces them, so the reactive references that fields hold stay valid.

When the `initialValues` passed to `useForm` changes, the form resets. The reset copies the new initial values into `values` and clears errors, messages, touched state, the submitted flag, and focus. The first assignment of initial values fills `values` and clears nothing else.

**Errors and messages.** [`errors`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.errors} holds blocking feedback. [`messages`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.messages} holds warnings, which do not block. Both are keyed by field path and then by a code, so `errors[path][code]` holds one message. Local validation writes the `required` and `validate` codes, and server feedback uses the `server` code. [`anyError`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.anyError} and [`anyMessage`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.anyMessage} report whether each map has any entry.

Warnings sit in their own map so that they never block a submit: the client's pre-submit checks read only `errors`. {@term Warning Confirmation} relies on this.

**Touched, focused, and submitted.** [`touched`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.touched} maps each blurred field path to `true`. [`anyTouched`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.anyTouched} reports whether any field is touched. [`focused`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.focused} holds the focused field's path, or `null`. [`submitted`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.submitted} becomes `true` when [`setAllTouched`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.setAllTouched} runs at submit, and a reset clears it.

**Aggregates from fields.** Mounted fields register hooks that feed three computed maps keyed by field path: [`modified`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.modified}, [`required`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.required}, and [`valid`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.valid}. [`anyModified`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.anyModified} is `true` when any field is modified. [`labels`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.labels} and [`showsErrors`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.showsErrors} also come from field hooks. The `ActionForm` validation summary reads them.

**Ignored fields.** [`ignored`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.ignored} maps each {@term Ignored Field} path to `true`. [Ignored Fields and Submitting Values](#ignored-fields-and-submitting-values) describes its effect.

## Field Context Responsibilities

`useField` projects the form context onto one field. It keeps no values of its own: reads come from the form state, and writes go through the form context's methods. A field keeps a local state of the same shape when it has the [`contextless`]{@api vue:component:FormField:prop:contextless} prop or no form context above it. It then emits [`update:modelValue`]{@api vue:component:FormField:event:update:modelValue}, so it also works outside a form.

**Value.** The field's [`state.value`]{@api js:property:@arrai-innovations/vueda/use/useField#FieldContextRawState.value} reads `values` at the field's path and writes through `updateValue`. Writing `undefined` deletes the value. Nested paths such as `address.city` and `items[0].sku` need no extra handling.

**Required by default.** A field is required unless its [`required`]{@api vue:component:FormField:prop:required} prop is `false`. The prop defaults to `null`, which counts as required. When a [`shouldRequireFn`]{@api vue:component:FormField:prop:shouldRequireFn} is given, it decides instead, from the field's dependency values. A [`readOnly`]{@api vue:component:FormField:prop:readOnly} field and an ignored field are never required.

**Hooks.** During setup, the field registers `isModified`, `isRequired`, and `isValid` hooks with the form. It unregisters them on unmount, so the form's aggregates cover only mounted fields. A field counts as modified when three things hold: its value differs from its initial value, it is not ignored, and the two values are not both unset (`undefined`, `null`, or `""`).

**Dependencies.** The [`validationDependencies`]{@api vue:component:FormField:prop:validationDependencies} prop lists other field paths that `shouldRequireFn` and `validate` read. The field registers them during setup. Their current values reach both functions as the field's `state.dependencyValues`.

**Blur.** A field context's [`blur()`]{@api js:property:@arrai-innovations/vueda/use/useField#FieldContext.blur} clears focus, marks the field touched, and clears the field's server feedback. [Server Validation Ingestion and Clearing](#server-validation-ingestion-and-clearing) describes the clearing.

## Local Validation Semantics

Local validation runs in the browser and writes only to `errors`, under two codes.

The `required` code comes from a watcher over six inputs:

- whether the field is required
- the [`requiredMessage`]{@api vue:component:FormField:prop:requiredMessage} prop
- whether the field is touched
- whether the value violates the required rule
- whether the field is modified
- the form's `submitted` flag

The watcher writes `errors[path].required` when the field is required, touched, and violating, and is also modified or in a submitted form. Otherwise it deletes the code. A touched field that is empty and unmodified therefore shows no required error until the first submit.

The default required rule, {@api js:function:@arrai-innovations/vueda/use/useField#defaultIsRequiredViolation}, treats `null`, `undefined`, `""`, `false`, and `0` as violations. The [`isRequiredViolation`]{@api vue:component:FormField:prop:isRequiredViolation} prop replaces it.

The `validate` code comes from the [`validate`]{@api vue:component:FormField:prop:validate} prop. Once the field is touched, VUEDA calls it with the value and the dependency values. A return of `true` means valid, and a string is the error message. Any other return writes the message "Validation Failed". The watcher does not run at setup. It runs on the first change to the result, so a partly initialized field does not flag itself.

A fresh form therefore shows no local errors. At submit, the form calls `setAllTouched()` and waits one Vue tick so the watchers run. It then reads `anyError`.

The `server` code is reserved for server feedback. [`updateError`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.updateError} and [`updateMessage`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.updateMessage} throw when given it, on the form context and on a field context:

```text
Error code "server" is reserved for server-originated validation and cannot be set from local validation. ...
```

Only `handleServerFormValidationError` writes the `server` code. The reservation keeps local errors out of the code that the submit checks treat as retryable.

## Server Validation Ingestion and Clearing

[`handleServerFormValidationError(error)`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.handleServerFormValidationError} copies the two maps of a {@api js:class:@arrai-innovations/vueda/utils/errors#ServerFeedbackError} into the form. Each `error.errors` entry becomes `errors[path].server`, and each `error.messages` entry becomes `messages[path].server`.

A `400` arrives as a {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}, which fills only `errors`. A `409` arrives as a {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError}, which fills only `messages`, with the warnings. [Error and Validation Contract](./error-and-validation-contract) describes both bodies and which adapters raise each class.

The method does not branch on the class. The submit flows decide what reaches it. They ingest a `FormValidationError` directly and send a `ConfirmationRequiredError` through [the warning confirmation](#the-warning-confirmation) first.

[`clearServerErrors(path, dependents)`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.clearServerErrors} removes the `server` code from `errors[path]` and `messages[path]`. It then does the same for each path in `dependents`. It clears one hop and does not follow the dependents' own dependents.

A dependent may contain `$parent`, which stands for the field's path up to its last `.`. For the field `items[0].quantity`, the dependent `$parent.price` clears `items[0].price`. `$parent` resolves only when the field's path contains a `.`.

A field's `blur()` calls `clearServerErrors` with the field's [`clearServerErrorDependents`]{@api vue:component:FormField:prop:clearServerErrorDependents} prop. Server feedback therefore stays until the user leaves the field. A value change without a blur, such as a programmatic write, leaves it in place.

## Ignored Fields and Submitting Values

[`submittingValues`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.submittingValues} is `values` with every ignored path removed. The submit flows send it as the request body.

For an array item path such as `items[2]`, VUEDA removes the item and closes the gap. Ignoring `items[2]` in a five-item array leaves four items. The other items stay, including falsy values such as `0`, `""`, `false`, and `null`.

An ignored field is never required and never counts as modified. `useObjectForm`'s default pre-submit check also skips errors on ignored paths and their children. It finds children by a `.` separator only, so ignoring `items` skips `items.name` but not `items[0].quantity`.

## Submission Gating Semantics

### Object form submission

{@api js:function:@arrai-innovations/vueda/use/useObjectForm#useObjectForm} submits create and update forms. Its [`submit()`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormInstance.submit} runs a fixed sequence:

1. Set [`loading`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawState.loading}, which views use to disable the submit button.
2. Call `setAllTouched()` and wait one tick so local validation runs.
3. If `anyModified` is `false`, call `onSubmitNotAnyModified`. The default, {@api js:function:@arrai-innovations/vueda/use/useObjectForm#defaultOnSubmitNotAnyModified}, shows a "No Changes Detected" toast and stops.
4. If `anyError` is `true`, call `onSubmitAnyError`. The default, {@api js:function:@arrai-innovations/vueda/use/useObjectForm#defaultOnSubmitAnyError}, drops errors on ignored paths and removes the `server` code from the rest. If any error remains, it shows a "Pre-save Validation Failed" toast, scrolls to the first error, and stops. If only `server` codes remain, the submit continues.
5. Send `submittingValues` to create or update. With the [`submitFields`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawProps.submitFields} prop, only those paths are sent.
6. On a `ConfirmationRequiredError` that carries a digest, run [the warning confirmation](#the-warning-confirmation).
7. On any other failure, call `onSubmissionError`. The default, {@api js:function:@arrai-innovations/vueda/use/useObjectForm#defaultOnSubmissionError}, ingests a `ServerFeedbackError`, shows a "Save Validation Failed" toast, and scrolls to the first error. For any other error it returns `false`, and the error becomes the form's [`state.error`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawState.error}.
8. On success, call `onSubmissionSuccess`. The default, {@api js:function:@arrai-innovations/vueda/use/useObjectForm#defaultOnSubmissionSuccess}, shows a success toast and follows [`redirectAfter`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawProps.redirectAfter}.

The four hooks named above are properties of the object `useObjectForm` returns, and so is [`onSubmissionWarningsRequireConfirmation`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormInstance.onSubmissionWarningsRequireConfirmation}. Replacing one hook leaves the rest of the sequence in place.

Server errors do not block a resubmit. After a failed save, the user edits and blurs a field, which clears that field's `server` code. `server` codes on fields the user has not revisited remain. The next submit still goes to the server, which validates again. A non-field server error has no field to blur, so without this rule it would block the form until a reset.

Both default hooks scroll to [`firstErrorField`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawState.firstErrorField}. {@api js:function:@arrai-innovations/vueda/use/useViewCreate#useViewCreate} and {@api js:function:@arrai-innovations/vueda/use/useViewUpdate#useViewUpdate} compute it with [`getFirstErrorField`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.getFirstErrorField} over the fields they display. A custom shell passes its own `firstErrorField` in the props it gives `useObjectForm`.

`getFirstErrorField` checks `non_field_errors` first, so a form-level error wins. For an array field it checks item paths such as `items[0]`. For a display path such as `items.quantity`, it checks `items[0].quantity`, `items[1].quantity`, and so on. The scroll target is an anchor named after the path. Each rendered field has one, and `FormMessage` with `type="error"` has one named `non_field_errors`.

### Action form submission

{@api js:function:@arrai-innovations/vueda/use/useActionForm#useActionForm} runs the submit for {@api vue:component:ActionForm}. It differs from the object form sequence in four ways:

- Its pre-submit checks run only when the [`hasInput`]{@api vue:component:ActionForm:prop:hasInput} prop is `true`. With `hasInput`, it waits one tick and stops with "No Changes Detected" when nothing is modified, unless [`requireModified`]{@api vue:component:ActionForm:prop:requireModified} is `false`. It stops with a "Submission Blocked" toast when a non-`server` error exists. `hasInput` defaults to `false`, and no view VUEDA ships sets it. Those views send the first submit without local checks.
- [`confirmDisabled`]{@api js:property:@arrai-innovations/vueda/use/useActionForm#ActionFormContext.confirmDisabled} disables the submit button while the action loads or while any field has a non-`server` error. The count includes errors on ignored paths. Local errors that appear after the first submit therefore disable the button even without `hasInput`.
- A `ServerFeedbackError` is ingested with no toast. This includes a `400` from the automatic {@term Dry Run}.
- Any other failure calls the [`onSubmissionErrorHandler`]{@api vue:component:ActionForm:prop:onSubmissionErrorHandler} prop when given. If there is no handler, or it returns `false`, the form records the error. It then shows an error toast titled by [`actionErrorSummary`]{@api vue:component:ActionForm:prop:actionErrorSummary}.

## The {@term Warning Confirmation}

A warning is advisory. The server holds a warned write until the user confirms it, and then the same write proceeds.

The server computes every warning from the submitted input and the current database state before it writes anything. Every gate raises before the write, so a `409` never commits.

A condition found only by performing the write is an error and aborts the request. Examples are a protected foreign key, a constraint violation, or a failure inside an action body. If a write fails after the user confirms, the request's transaction rolls back and the error follows the normal error path. [Configuration Surface and Defaults](./configuration-surface-and-defaults) describes that transaction.

The [write confirmation guide](../guides/require-write-confirmation) shows how to declare warnings on the server. [Error and Validation Contract](./error-and-validation-contract) describes the `409` body.

### Confirmation in object forms

A create or update can fail with a `ConfirmationRequiredError` that carries a digest. `useObjectForm` then calls `onSubmissionWarningsRequireConfirmation`. The default, {@api js:function:@arrai-innovations/vueda/use/useObjectForm#defaultOnSubmissionWarningsRequireConfirmation}, does three things in order:

1. It clears the `server` code from the fields the previous prompt warned about, so a changed warning set leaves no stale warnings.
2. It ingests the new warnings into `messages`, so the fields show them behind the dialog.
3. It opens the [`confirmation`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormInstance.confirmation} controller and waits for the user.

On confirm, the form sends the same write once more, with the [digest]{@api js:property:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError.digest} in the `Acknowledge-Warnings` header. If the warnings changed in the meantime, the server returns a new digest and the form prompts again. On cancel, the form stays unsaved, the warnings stay on the fields, and [`submitErrored`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormRawState.submitErrored} is set.

A `409` without a digest skips the prompt and goes to `onSubmissionError`. Its default returns `false`, so the error becomes `state.error`. A retry without the header would be gated again on every attempt.

### Confirmation in action forms

`useActionForm` runs the same flow with the same default hook. The [`onSubmissionWarningsRequireConfirmation`]{@api vue:component:ActionForm:prop:onSubmissionWarningsRequireConfirmation} prop replaces it. The automatic dry run never prompts and drops its `409`. A cancel marks the action form errored with no error, so no toast, banner, or redirect follows. Both composables build their controller with {@api js:function:@arrai-innovations/vueda/use/useConfirmationController#useConfirmationController}.

### Dialog mounting and failing closed

The controller needs a dialog bound to it. {@api vue:component:FormConfirmDialog} registers itself with its [`controller`]{@api vue:component:FormConfirmDialog:prop:controller} when it mounts. {@api vue:component:ViewCreate} and {@api vue:component:ViewUpdate} render one bound to the object form's controller. `ActionForm` renders its own, so {@api vue:component:ViewAction}, {@api vue:component:ViewDestroy}, and custom `ActionForm` shells need no extra markup.

A shell that calls `useObjectForm` or `useActionForm` directly renders its own `FormConfirmDialog`. It can instead register a custom consumer with the controller's [`register()`]{@api js:property:@arrai-innovations/vueda/use/useConfirmationController#ConfirmationController.register}.

When a prompt starts and no consumer is registered, the controller fails closed. It logs a console warning that names the missing dialog and resolves as cancelled. The write is not sent again, and the warnings stay on the fields.

### Warnings and submit checks

The pre-submit checks read only `errors`, so warnings never stop a submit. Each submit reaches the server, where the confirmation gate runs.

`FormMessage` renders non-field warnings when its [`type`]{@api vue:component:FormMessage:prop:type} is `"message"`. `FormField` renders a field's warnings with a second `FieldMessage` whose [`severity`]{@api vue:component:FieldMessage:prop:severity} is `"warning"`.

## Non-Field and Structured Feedback

Form-level feedback uses the `non_field_errors` key, which the client holds as {@api js:property:@arrai-innovations/vueda/utils/constants#NON_FIELD_ERRORS_KEY}. `FormMessage` reads `errors.non_field_errors` and renders every entry together. With `type` set to `"message"`, it reads `messages.non_field_errors` instead.

A server error entry can be an object. [Error and Validation Contract](./error-and-validation-contract) describes when the client keeps an object whole. `FormMessage` renders such an object as one `name: value` line per key, and its [default slot]{@api vue:component:FormMessage:slot:default} replaces that rendering. Under a field key, `FieldMessage` renders only strings and objects with a `message` property. Other objects there show nothing. [Handle Form Validation and Server Errors](../guides/form-validation-and-errors) shows a custom renderer.

`ActionForm` adds a validation summary for field errors that no rendered field shows. Each field reports through `useField` whether the reader can see its own error messages. The form collects the reports in `showsErrors`. The summary sits above the fields, beside the non-field messages, and lists only the errors whose path has no `true` entry in `showsErrors`:

- an error on a field rendered with [`hidden`]{@api vue:component:FormField:prop:hidden}
- an error on a field inside a collapsed inline field set
- an error on a field whose renderer failed
- an error on a path that no rendered field uses

Each entry takes its name from `labels`, or from the path when no field registered a label.

## Observable Failure Signatures

**Stale server feedback after an edit without blur.** Server feedback stays until the field blurs. After a programmatic change, or while the user is still in the field, the old message stays visible. The form still submits, because `server` codes do not block it.

**No transitive clearing.** `clearServerErrors` clears the field and the dependents named in that call. It does not follow the dependents' own `clearServerErrorDependents`.

**Ignored arrays and item errors.** Ignoring `items` does not skip errors at `items[0].quantity` in `useObjectForm`'s pre-submit check, because children match only after a `.`. Those errors keep the form blocked. Ignoring the item path `items[0]` does skip them.

**Validation-shaped bodies on other statuses.** The default write adapters build a `ServerFeedbackError` only from a `400` or a `409`. A validation-shaped body with another status, such as a `500`, leaves the form state empty. It surfaces through generic error handling unless a custom adapter raises a `ServerFeedbackError` subclass for it.
