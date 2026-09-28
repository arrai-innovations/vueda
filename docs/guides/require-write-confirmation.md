---
title: Require Confirmation Before a Write
type: how-to
audience: integrator
status: draft
---

# Require Confirmation Before a Write

Use a warning when a write is valid but the user should acknowledge something first, such as "this deactivates the last administrator." A {@term Warning Confirmation} holds the write, shows the warnings, and runs the write once the user confirms. This guide adds warnings to each kind of write on the server and sets up the client to confirm them.

The server answers an unconfirmed write with `409 Conflict` and a body holding `confirmation_required`, `digest`, and `warnings`. [Error and Validation Contract](../core-concepts/error-and-validation-contract.md) describes that body and its two warning shapes. The generated REST reference does not list the 409 response. [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md) describes the client side from prompt to resubmit.

## Pick the Hook for Your Write

| Write                                    | Where you return warnings                                     |
| ---------------------------------------- | ------------------------------------------------------------- |
| `create`, `update`, `partial_update`     | The serializer's `get_warnings()`                             |
| `destroy`, `activate`, `deactivate`      | The viewset's `get_warnings_for_object()` or `get_warnings()` |
| An {@term Extra Action} that takes input | A `gate_warnings()` call in the action body                   |
| An extra action that takes no input      | `@action(confirm=True)`                                       |
| A workflow {@term Transition}            | The model's `get_transition_warnings()`                       |

Bulk creates and updates, which save through a list serializer, are never gated.

Compute each warning from the submitted input and the current database state. A condition you can find only by writing, such as a protected foreign key or a constraint violation, is an error: raise it as a validation error. [Form State and Validation Lifecycle](../core-concepts/form-state-and-validation-lifecycle.md) explains why warnings come before the write.

## Warn on Create and Update

Override [`get_warnings`]{@api py:function:vueda.core.serializers.VuedaSerializer.get_warnings} on the serializer. Return messages keyed by field, with `non_field_errors` for messages about the whole object:

```python
from vueda.core.serializers import VuedaSerializer


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

{@api py:class:vueda.core.viewsets.VuedaViewSet} calls `get_warnings()` after validation passes and before it saves, so `self.validated_data` is set. On an update, `self.instance` holds the object before the save. Do not raise from `get_warnings()`; put blocking checks in `validate()`.

## Warn on Delete, Activate, and Deactivate

These writes have no per-object serializer, so the viewset returns their warnings. Override [`get_warnings_for_object(action, obj)`]{@api py:function:vueda.core.viewsets.WarningConfirmationMixin.get_warnings_for_object} from {@api py:class:vueda.core.viewsets.WarningConfirmationMixin}, which every `VuedaViewSet` includes. `action` is `"destroy"`, `"activate"`, or `"deactivate"`:

```python
class WidgetViewSet(VuedaViewSet):
    serializer_class = WidgetSerializer

    def get_warnings_for_object(self, action, obj):
        if action == "destroy" and obj.is_published:
            return {"non_field_errors": ["Published widgets disappear from the storefront when deleted."]}
        return {}
```

This one hook gates both single and bulk requests. For a bulk request, the default [`get_warnings(action, objs)`]{@api py:function:vueda.core.viewsets.WarningConfirmationMixin.get_warnings} calls it once per object and keys each result by `str(pk)`. To check a bulk request with one query, override `get_warnings` instead. `objs` is a queryset:

```python
    def get_warnings(self, action, objs):
        if action != "destroy":
            return {}
        message = "Published widgets disappear from the storefront when deleted."
        published = objs.filter(is_published=True).values_list("pk", flat=True)
        return {str(pk): {"non_field_errors": [message]} for pk in published}
```

- `destroy` calls the hook after [`destroy_validation`]{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy_validation} and before it deletes.
- `activate` and `deactivate` exist only on a viewset that mixes in {@api py:class:vueda.core.viewsets.DeactivateActionViewSetMixin}, for a model based on {@api py:class:vueda.core.models.ActivatableBaseModel}.
- A bulk request gates as a whole: one warned object holds the batch, and confirming runs all of it.

## Warn on a Workflow Transition

Override [`get_transition_warnings(transition, user=None)`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.get_transition_warnings} on a {@term Workflow-Enabled Model}. The default comes from {@api py:class:vueda.workflow.models.WorkflowModelMethods} and returns `{}`:

```python
class Order(VuedaModel):
    class Vueda:
        class Workflow:
            enabled = True

    def get_transition_warnings(self, transition, user=None):
        if transition.code == "cancel" and self.paid:
            return {"non_field_errors": ["Cancelling a paid order issues a refund."]}
        return {}
```

[`execute_transition`]{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition} calls the hook after it checks permission and availability, and before it writes. A bulk request collects warnings from every object and gates the batch once, keyed by object id.

## Warn in a Custom Action

A custom action body writes directly, so it calls the gate itself. Call {@api py:function:vueda.core.exceptions.gate_warnings} after `serializer.is_valid(raise_exception=True)` and before any write or side effect:

```python
from rest_framework import status
from rest_framework.response import Response
from vueda.core.decorators import action
from vueda.core.exceptions import gate_warnings


class InvoiceViewSet(VuedaViewSet):
    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        invoice = self.get_object()
        serializer = SendInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # blocking errors return 400 first
        warnings = {}
        if invoice.customer.balance_overdue:
            warnings["non_field_errors"] = ["This customer has an overdue balance."]
        gate_warnings(request, warnings)
        # Past the gate: there were no warnings, or the user confirmed them.
        invoice.send()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

- Pass `{field: [messages]}` when the request names one object in its URL, or no object at all.
- Pass `{object_id: {field: [messages]}}`, keyed by `str(pk)`, when a {@term Bulk Action} request goes to the list URL. The client sends a request for one selected object to its detail URL, so a bulk action body checks whether `pk` is set.
- An empty mapping passes the gate.

A 409 rolls back the request's database transaction, as [Request Transactions](../core-concepts/configuration-surface-and-defaults.md#request-transactions) describes. Work outside the database, such as an email or a call to another service, does not roll back, so call the gate before it. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#warning-confirmation-gating) describes the gate order in actions and how gating relates to a {@term Dry Run}.

## Always Confirm an Action Without Input

For an action that takes no input, declare [`confirm=True`]{@api py:param:vueda.core.decorators.action.confirm} on VUEDA's {@api py:function:vueda.core.decorators.action}. The first unconfirmed request returns 409 before the body runs. Set the message with a `confirm_message` attribute on the action; without one, it is {@api py:property:vueda.core.decorators.DEFAULT_CONFIRM_MESSAGE}:

```python
class InvoiceViewSet(VuedaViewSet):
    @action(detail=True, methods=["post"], confirm=True)
    def reissue(self, request, pk=None):
        ...

    reissue.confirm_message = "Reissuing voids the original invoice."
```

A validation error in the body shows only after the user confirms. For an action that takes input, call `gate_warnings` after validation instead.

## Confirm Warnings on the Client

1. The stock views need no setup. `ViewCreate` and `ViewUpdate` render a {@api vue:component:FormConfirmDialog} for their form. {@api vue:component:ActionForm} mounts its own dialog. {@api vue:component:ViewAction}, {@api vue:component:ViewActivate}, {@api vue:component:ViewDeactivate}, {@api vue:component:ViewDestroy}, and {@api vue:component:ViewExecuteTransition} build on it through {@api vue:component:ModelActionForm}, as can your own shells.

2. In a custom shell that calls {@api js:function:@arrai-innovations/vueda/use/useObjectForm#useObjectForm}, bind a dialog to its [`confirmation`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormInstance.confirmation} controller:

    ```vue
    <script setup>
    import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
    </script>

    <template>
        <form @submit.prevent="objectForm.submit">
            <!-- field components -->
        </form>
        <FormConfirmDialog :controller="objectForm.confirmation" />
    </template>
    ```

3. When you call {@api js:function:@arrai-innovations/vueda/use/useActionForm#useActionForm} without `ActionForm`, bind a `FormConfirmDialog` to its [`confirmation`]{@api js:property:@arrai-innovations/vueda/use/useActionForm#ActionFormContext.confirmation} controller the same way.

4. For a dialog of your own, call [`register()`]{@api js:property:@arrai-innovations/vueda/use/useConfirmationController#ConfirmationController.register} on mount and `unregister()` on unmount. Show it while `open` is true, list the warnings from `messages`, and call `confirm()` or `cancel()`. You can also replace the `onSubmissionWarningsRequireConfirmation` hook on `useObjectForm`'s return value or [on `ActionForm`]{@api vue:component:ActionForm:prop:onSubmissionWarningsRequireConfirmation}. With no dialog registered, a warned submit resolves as cancelled and logs a console warning.

5. In a custom [`run-action`]{@api vue:component:ActionForm:prop:runAction}, send the `acknowledgeWarnings` argument as the `Acknowledge-Warnings` header, and throw `ConfirmationRequiredError` on a 409. {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#actionRequestHeaders} and {@api js:function:@arrai-innovations/vueda/utils/fetchSupport#readActionResponse} do both. For a request to a list URL, pass `bulk: true`, even when it targets one object:

    ```js
    import { actionRequestHeaders, readActionResponse } from "@vueda/utils/fetchSupport.js";

    async function runArchive({ formValues, dryRun, acknowledgeWarnings }) {
        const response = await fetch("/routes/shop/order/archive/", {
            method: "POST",
            headers: actionRequestHeaders({ dryRun, acknowledgeWarnings }),
            credentials: "include",
            body: JSON.stringify({ pks: selectedPks, ...formValues }),
        });
        return readActionResponse(response, { messagePrefix: "Failed to archive orders", bulk: true });
    }
    ```

    The client cannot tell the two warning shapes apart from the body, so the code that sends the request sets [`bulk`]{@api js:property:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError.bulk}.

6. To run a transition from your own code, catch the {@api js:class:@arrai-innovations/vueda/utils/errors#ConfirmationRequiredError} from [`executeTransition`]{@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition}. After the user confirms, call it again with the error's `digest` as the `acknowledgeWarnings` argument. `askUser` stands for your own prompt:

    ```js
    import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
    import { ConfirmationRequiredError } from "@vueda/utils/errors.js";

    const workflow = storeWorkflow();

    async function cancelOrder(pk) {
        try {
            return await workflow.executeTransition("shop", "order", pk, "cancel");
        } catch (error) {
            if (!(error instanceof ConfirmationRequiredError)) {
                throw error;
            }
            if (!(await askUser(error.messages))) {
                return null;
            }
            return workflow.executeTransition("shop", "order", pk, "cancel", undefined, undefined, false, error.digest);
        }
    }
    ```

    {@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectPatch} works the same way: it takes `acknowledgeWarnings` and throws `ConfirmationRequiredError` on a 409.

## Change How Warnings Render

- `ViewCreate` and `ViewUpdate` list the warnings with {@api vue:component:FieldWarningsList}, which names each field by its form label. Replace the whole list with the [`form-confirm-dialog-warnings`]{@api vue:component:ViewCreate:slot:form-confirm-dialog-warnings} slot, which receives `warnings`. Replace one field's entry with the [`warning-entry`]{@api vue:component:ViewCreate:slot:warning-entry} slot, which receives `field`, `label`, and `messages`.
- `ModelActionForm` groups a bulk request's warnings by object and labels each group with the object's name. It offers the same two slots. Its [`warning-entry`]{@api vue:component:ModelActionForm:slot:warning-entry} slot also receives `pk`, and its [`form-confirm-dialog-warnings`]{@api vue:component:ModelActionForm:slot:form-confirm-dialog-warnings} slot also receives `bulk` and `normalizedWarnings`.
- A bare `ActionForm` shows `FormConfirmDialog`'s default: a flat list of messages with no field or object names. To group them, fill its [`form-confirm-dialog-warnings`]{@api vue:component:ActionForm:slot:form-confirm-dialog-warnings} slot, which receives `warnings` and `bulk`:

    ```vue
    <action-form :run-action="runArchive">
        <template #form-confirm-dialog-warnings="{ warnings, bulk }">
            <template v-if="bulk">
                <section v-for="(fieldWarnings, pk) in warnings" :key="pk">
                    <h4>Order {{ pk }}</h4>
                    <field-warnings-list :messages="fieldWarnings" />
                </section>
            </template>
            <field-warnings-list v-else :messages="warnings" />
        </template>
    </action-form>
    ```

- On `FormConfirmDialog` itself, the [`warnings`]{@api vue:component:FormConfirmDialog:slot:warnings} slot receives `warnings`, `flatWarnings`, and `bulk`. Its `title`, `description`, `confirmLabel`, and `cancelLabel` props set the dialog text.

## Verify

- A create or update that returns warnings opens the dialog. Confirming saves; cancelling leaves the form unsaved with the warnings shown.
- A warned delete, activate, custom action, or transition opens the dialog from `ActionForm`.
- A bulk request prompts once for the whole batch, writes nothing before you confirm, and applies every object after.
- At the API level, the first request returns 409, and the same request with the digest succeeds:

    ```python
    response = client.delete(url)
    assert response.status_code == 409
    digest = response.json()["digest"]
    response = client.delete(url, HTTP_ACKNOWLEDGE_WARNINGS=digest)
    assert response.status_code == 204
    ```

## Troubleshooting

**The confirmation dialog never appears.** Check these in order:

- The hook returns a non-empty mapping for this input. An empty mapping passes the gate.
- The write is not a bulk create or update, which is never gated.
- A dialog is bound to the controller. Without one, the browser console shows a warning and the submit resolves as cancelled.
- A project `EXCEPTION_HANDLER` that replaces {@api py:function:vueda.core.exceptions.debug_stack_exception_handler} keeps the `digest` in the 409 body. Without a digest, the client treats the 409 as an error.

**The dialog opens again after the user confirms.** The warnings changed between the two requests, so the digest changed. Keep warning text the same across requests: a message that includes the current time changes the digest every time.

**A bulk action's warnings render as one flat, unlabeled group.** The `ConfirmationRequiredError` reported `bulk: false` for a per-object response. A custom `run-action` that sends a bulk request must pass `bulk: true`, as in step 5 of [Confirm Warnings on the Client](#confirm-warnings-on-the-client). `ModelActionForm` reads `bulk` from the error and ignores how many objects are selected.
