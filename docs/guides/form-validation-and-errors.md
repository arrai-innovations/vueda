---
title: Handle Form Validation and Server Errors
type: how-to
audience: integrator
status: draft
---

# Handle Form Validation and Server Errors

This guide gets server validation errors into form fields, clears them when the user edits, and blocks submission only on local errors. The stock form views already do all of this: {@api vue:component:ViewCreate} and {@api vue:component:ViewUpdate} through {@api js:function:@arrai-innovations/vueda/use/useObjectForm#useObjectForm}, and the action views through {@api vue:component:ActionForm}. Follow these steps for a custom form, a custom endpoint, or an error payload that the defaults do not render.

[Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md) describes the form state that these steps write to. [Error and Validation Contract](../core-concepts/error-and-validation-contract.md) describes the response shapes and the client error class that each status becomes. To hold a valid write until the user confirms a warning, see [Require Confirmation Before a Write](require-write-confirmation.md).

## Before You Begin

- The form calls {@api js:function:@arrai-innovations/vueda/use/useForm#useForm} to create its {@term Form Context}, and each field calls {@api js:function:@arrai-innovations/vueda/use/useField#useField}. {@api vue:component:FormField} and the other VUEDA field components call `useField` for you.
- The endpoint answers a validation failure with HTTP 400. The next section covers the server side.

## Return Errors the Client Can Map

On the server, raise {@api py:class:vueda.core.exceptions.VuedaValidationError} with a dict keyed by field. [DRF's `ValidationError`]{@api ext:drf:rest_framework.exceptions.ValidationError} produces the same body for a dict. The client keys each message by its {@term Field Path}, so the key decides where the message appears:

| Payload                                            | Where the client shows it                                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `{"quantity": ["Must be positive."]}`              | Under the `quantity` field.                                                                                                        |
| `{"items": [{"quantity": ["Must be positive."]}]}` | Under the `quantity` field of the first `items` row (`items[0].quantity`).                                                         |
| `{"non_field_errors": ["Dates overlap."]}`         | In the form's `FormMessage`.                                                                                                       |
| `{"detail": "Invalid request."}`                   | In `ActionForm`'s validation summary under `detail`. `ViewCreate` and `ViewUpdate` show only their "Save Validation Failed" toast. |
| `{"9": {"count": ["Too high."]}}`                  | In `ActionForm`'s validation summary under the raw key `9.count`, with no object label.                                            |

For a rule that spans several fields, raise the errors as a list. VUEDA's exception handler puts a list under `non_field_errors`, which makes it a {@term Non-Field Error}:

```python
from vueda.core.exceptions import VuedaValidationError

raise VuedaValidationError(["The start date must be before the end date."])
```

The client does not label bulk errors by object. To tell the user which object failed, name it in the message text, for example `{"non_field_errors": ["Order 9: count is too high."]}`. A bulk delete answers a missing or refused row with `{"9": ["Object with pk=9 does not exist."]}`, which `ActionForm`'s summary lists under `9`.

## Classify Responses in a Custom Fetch Wrapper

Only a {@api js:class:@arrai-innovations/vueda/utils/errors#ServerFeedbackError} reaches form state. The stock write adapters throw its subclass {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError} on a 400, so a wrapper for a custom endpoint must do the same.

Pass the response to {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#readActionResponse}. It throws `FormValidationError` on a 400, {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError} on a 409, and {@api js:class:@arrai-innovations/vueda/utils/errors#FetchError} on any other failure. {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#actionRequestHeaders} adds the CSRF and JSON headers:

```js
import { actionRequestHeaders, readActionResponse } from "@vueda/utils/fetchSupport.js";

export async function recalculateTotals(url, formValues) {
    const response = await fetch(url, {
        method: "POST",
        headers: actionRequestHeaders(),
        credentials: "include",
        body: JSON.stringify(formValues),
    });
    return readActionResponse(response, { messagePrefix: "Failed to recalculate totals" });
}
```

`readActionResponse` treats every `response.ok` status as success. To accept only certain codes, pass `successStatuses`, for example `new Set([204])` for a delete.

## Ingest Server Errors in a Custom Submit Handler

`useObjectForm` and `ActionForm` run this step for you. A form that submits on its own, such as a sign-in form, repeats it in its submit handler:

```js
import { ConfirmationRequiredError, ServerFeedbackError } from "@vueda/utils/errors.js";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { nextTick } from "vue";

async function submit() {
    formContext.setAllTouched();
    await nextTick();
    const ignored = Object.keys(formContext.state.ignored).filter((path) => formContext.state.ignored[path] === true);
    const blockingErrors = Object.entries(formContext.state.errors)
        .filter(([path]) => !ignored.some((ignoredPath) => path === ignoredPath || path.startsWith(`${ignoredPath}.`)))
        .filter(([, codes]) => !isEmpty(omit(codes, "server")));
    if (blockingErrors.length) {
        return;
    }
    try {
        await submitFn(formContext.state.submittingValues);
    } catch (error) {
        if (error instanceof ServerFeedbackError && !(error instanceof ConfirmationRequiredError)) {
            formContext.handleServerFormValidationError(error);
            return;
        }
        throw error;
    }
}
```

1. [`setAllTouched`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.setAllTouched} and `await nextTick()` let the required and `validate` checks run on fields that the user never touched.
2. Errors under the `server` code do not block, so the user can resubmit and the server checks again. Errors on an {@term Ignored Field} do not block either.
3. [`submittingValues`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContextRawState.submittingValues} leaves ignored fields out of the payload.
4. [`handleServerFormValidationError`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.handleServerFormValidationError} writes the response's errors into the form as {@term Server Feedback}. A `ConfirmationRequiredError` belongs to the confirmation flow in [Require Confirmation Before a Write](require-write-confirmation.md).

## Clear Related Server Errors on Blur

A field's server errors clear when the field blurs. When one field's value causes a server error on another field, set [`clearServerErrorDependents`]{@api vue:component:FormField:prop:clearServerErrorDependents} on the field that the user edits. `$parent` stands for the parent path of the blurred field, so inside an {@term Inline} it names the same row.

Set it in the model config's [`fieldProps`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fieldProps} with [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}, keyed by field path. The [`fieldProps` prop of `FormModel`]{@api vue:component:FormModel:prop:fieldProps} takes the same map:

```js
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

storeModelConfig().setConfig(
    { app: "shop", model: "order" },
    {
        fieldProps: {
            "line_items.sku": {
                clearServerErrorDependents: ["$parent.quantity", "$parent.price"],
            },
        },
    },
);
```

Blurring `line_items[2].sku` clears the server errors on `line_items[2].quantity` and `line_items[2].price`. Clearing goes one step: the dependents' own dependents keep their errors.

## Show Form-Level and Field Errors

`FormModel` renders the form-level messages and `FormField` renders each field's messages, so the stock views need no extra markup. In a custom form, place {@api vue:component:FormMessage} inside the form context. `type="error"` shows non-field errors and `type="message"` shows non-field warnings:

```vue
<form @submit.prevent="submit">
    <form-message type="error" />
    <form-message type="message" />
    <!-- field components -->
</form>
```

`FormField` renders the label, help text, errors, and warnings around the widget in its default slot:

```vue
<script setup>
import FormField from "@vueda/form/form-model/FormField.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
</script>

<template>
    <FormField name="email" label="Email">
        <WidgetTextInput />
    </FormField>
</template>
```

[Forms](../reference/components/forms.md) describes how these messages look.

### Action Form Validation Summary

`ActionForm` shows a validation summary above its fields when a field error has no rendered field showing it. The summary lists errors for these fields:

- a field rendered with `hidden`
- a field inside a collapsed inline field set
- a field whose renderer failed
- a key that the form does not render

A form whose errors all render beside their fields shows no summary. Each row names its field by the label shown above the input. When no rendered field reports a label, the row uses the error key.

A custom field component tells the form whether it shows its own errors through the third argument to `useField`. The default is `true`. A component that renders no inline error messages passes a [`showsErrors`]{@api js:property:@arrai-innovations/vueda/use/useField#UseFieldOptions.showsErrors} function that returns `false`, so that its errors move into the summary:

```js
const field = useField(props, emit, { showsErrors: () => false });
```

A field still counts as showing its errors when a slot override replaces its error rendering. Those slots are [`field(fieldName)errors`]{@api vue:component:FormField:slot:field(fieldName)errors}, `field-errors`, and a field set's [`field-set-level-chores`]{@api vue:component:FieldSetMany:slot:field-set-level-chores}. An override of those slots should render the errors that it receives.

The [`validation-summary`]{@api vue:component:ActionForm:slot:validation-summary} slot replaces the summary. It receives `entries` (each `{ field, label, messages }`), `count`, and `title`, covering only the errors that the summary would list.

### Render Structured Feedback Objects

Most messages are strings. To send a message with structured data, such as a list of rows, send an object with a `detail` key under `non_field_errors`. The client keeps an entry with a `detail` key as one object. `FormMessage` renders these objects. Under a field key, `FieldMessage` renders only strings and objects with a `message` property, so a `detail` object there shows nothing.

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

By default, `FormMessage` renders each key of the object as a `name: value` line. To render the object your way, override the [default slot]{@api vue:component:FormMessage:slot:default}, which receives each `message`, and match on its shape:

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

Write one branch per object shape that your server sends.

## Verify

- Submitting invalid data shows each error under its field.
- Non-field errors appear in the form's `FormMessage`.
- Blurring a field that had a server error clears that error.
- With only server errors left, submitting sends the request again.
- In `ViewCreate`, `ViewUpdate`, or another `useObjectForm` form, an empty required field blocks submission with a "Pre-save Validation Failed" toast. [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md) describes when `ActionForm` blocks on local errors.
- Structured non-field objects render through your `FormMessage` slot override, or as `name: value` lines without one.
- In `ViewCreate` and `ViewUpdate`, a failed save scrolls to the non-field errors first, then to the first displayed field with an error.

## Troubleshooting

**Form feedback is empty after a failed request.** Check the response status. Only a 400 on a write becomes `FormValidationError`. A 403, a 500, or any error on a read becomes `FetchError` or {@api js:class:@arrai-innovations/vueda/utils/errors#ListFilterError}, which never reaches form state. [Error and Validation Contract](../core-concepts/error-and-validation-contract.md) lists the class that each adapter throws.

**Server errors do not clear after editing a field.** Blur clears them, and a value change alone does not. Check that the field component calls [`FieldContext.blur()`]{@api js:property:@arrai-innovations/vueda/use/useField#FieldContext.blur} when its input loses focus.

**A custom submit handler does not block on local errors.** Call `setAllTouched()` and `await nextTick()` before reading the errors, as in [Ingest Server Errors in a Custom Submit Handler](#ingest-server-errors-in-a-custom-submit-handler).
