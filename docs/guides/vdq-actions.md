---
title: Run Actions in the VUEDA Dispatch Queue (VDQ)
type: how-to
audience: integrator
status: draft
---

# Run Actions in the VUEDA Dispatch Queue (VDQ)

This guide sets up the {@term VDQ (VUEDA Dispatch Queue)} in a scaffolded project. It routes the VDQ API, runs the Celery worker, creates senders and receivers, and grants permissions. It then shows how to inspect each {@term Queue Item} and how to retry, cancel, and resend items through the API.

[VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md) describes the queue item lifecycle, its states and transitions, and its known limitations. Provider setup is in [Send Email from VDQ with Anymail](./vdq-email-anymail.md) and [Send SMS from VDQ with Twilio](./vdq-sms-twilio.md).

## Before You Begin

- {@api py:module:vueda.vdq} and {@api py:module:vueda.workflow} are in `VUEDA_APPS`. Both are in the default list. VDQ raises `ImproperlyConfigured` at startup if it is installed without workflow.
- You have run `migrate`. VDQ's migrations create the queue item workflow, including its permission rows.
- A message broker, such as Redis, is running. Set `CELERY_BROKER_URL` in `server/config.local.toml`; the scaffolded file has a commented example.

## Include the VDQ URLs

The project templates route the `vueda.info` and `vueda.user` URLs only. Add the [VDQ URL patterns]{@api py:module:vueda.vdq.urls} to `server/config/urls.py`. Retry and cancel use the workflow API, so add the [workflow URL patterns]{@api py:module:vueda.workflow.urls} too if your project does not include them yet:

```python
from django.urls import include, path

from vueda.info.urls import urlpatterns as vueda_info_urls
from vueda.user.urls import urlpatterns as vueda_user_urls
from vueda.vdq.urls import urlpatterns as vueda_vdq_urls  # [!code ++]
from vueda.workflow.urls import urlpatterns as vueda_workflow_urls  # [!code ++]

urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("", include(vueda_info_urls)),
                path("", include(vueda_user_urls)),
                path("", include(vueda_vdq_urls)),  # [!code ++]
                path("", include(vueda_workflow_urls)),  # [!code ++]
                path("", include("your_project.urls")),
            ]
        ),
    ),
]
```

These patterns mount everything that VDQ serves under `routes/vueda.vdq/`: the queue item and sent item endpoints, attachment downloads, the Anymail tracking webhook, and the Twilio status callback. The VDQ URL list is empty unless both VDQ and workflow are installed.

The queue item API builds attachment download links from the `VDQ_URL` setting, which `get_defaults` does not set. Set it in `server/config/settings/base.py`, after the `get_defaults` line, to the path that you included:

```python
VDQ_URL = "/routes/vueda.vdq"
```

## Run the Worker

VDQ defines its own Celery app in {@api py:module:vueda.vdq.celery}. It reads `CELERY_`-prefixed Django settings. From `server/`, start a worker with an embedded beat scheduler:

```console
DJANGO_SETTINGS_MODULE=config.settings.local uv run celery -A vueda.vdq.celery:app worker -l info -B
```

- The worker runs {@api py:function:vueda.vdq.tasks.send_message} for each queued item.
- The `-B` flag runs Celery beat inside the worker. Beat schedules the periodic SMS status tasks, which [Send SMS from VDQ with Twilio](./vdq-sms-twilio.md#run-celery-beat) describes. Pass `-B` to one worker only, since each beat schedules its own copy of the tasks.

Without a running worker, new items stay `queued`. Separate worker and beat processes for production are part of the deployment guide that [#246](https://github.com/arrai-innovations/vueda/issues/246) tracks.

## Create Senders and Receivers

Every queue item refers to a {@api py:class:vueda.vdq.models.Sender} and a {@api py:class:vueda.vdq.models.Receiver}. Both models have the same three fields:

- `name`: display text.
- `email`: required to send or receive email.
- `cell`: a phone number, stored in E.164 form. Required to send or receive SMS.

Create them in your own code, for example when a user signs up or when you first message a contact:

```python
from vueda.vdq.models import Receiver, Sender

support, _ = Sender.objects.get_or_create(name="Support", email="support@example.com")
customer, _ = Receiver.objects.get_or_create(
    name="Pat Customer", email="pat@example.com", cell="+18005550123"
)
```

Queue items protect their sender and receiver from deletion, so reuse these rows for later messages.

## Queue a Message

Call {@api py:function:vueda.vdq.schedulers.add_email} or {@api py:function:vueda.vdq.schedulers.add_sms} with those rows. The email and SMS guides describe the arguments. Each call creates its queue items in `queued` and publishes one send task per item when the surrounding transaction commits. If publishing the task fails with a broker or Celery error, the item moves to `errored`, with the error in [`result`]{@api py:function:vueda.vdq.models.QueueItem.result}.

## Grant Permissions

Grant these permissions to the groups of the users who operate the queue. [Manage Groups and Generate Group Migrations](./manage-groups.md) shows how. Test with a user whose groups grant them; a superuser skips the checks that other users meet.

| Task                              | Permissions                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| List queued and in-progress items | `vueda_vdq.list_queueitem`                                                                                     |
| Read one queue item               | `vueda_vdq.read_queueitem`                                                                                     |
| List and read sent items          | `vueda_vdq.list_sentitem`, `vueda_vdq.read_sentitem`                                                           |
| Retry an item                     | `vueda_workflow.read_workflow`, `vueda_vdq.read_queueitem`, `vueda_vdq.list_queueitem`, `vueda_vdq.can_retry`  |
| Cancel an item                    | `vueda_workflow.read_workflow`, `vueda_vdq.read_queueitem`, `vueda_vdq.list_queueitem`, `vueda_vdq.can_cancel` |
| Resend a sent item                | `vueda_vdq.can_resend`                                                                                         |

For retry and cancel, `vueda_vdq.list_queueitem` is the queue item workflow's {@term Workflow Permission}. `vueda_vdq.can_retry` and `vueda_vdq.can_cancel` are the {@term Transition Permission} rows of the `retry` and `cancel` transitions. Resend checks `vueda_vdq.can_resend` alone.

## Inspect Queue Items

The [queue item endpoint]{@api rest:endpoint:GET:/vueda.vdq/queueitem/} at `/routes/vueda.vdq/queueitem/` lists items that are not in a {@term Done State}, oldest first. `errored` is not a done state, so failed items stay in this list. Fetch `/routes/vueda.vdq/queueitem/<id>/` to read one item in any state.

Each item includes:

- `workflow_state_code` and `workflow_state_name`: the current state.
- `result`: the provider status or the error text.
- `retry_delay`: seconds until the next automatic retry of a `delayed` item.
- `valid_transitions`: the transitions that the requesting user can run from the current state, such as `retry` or `cancel`.

Add `e=anymail` or `e=sms` to the request to {@term Expand} the message detail, and add `e=sender,receiver` to expand the sender and receiver.

The [sent item endpoint]{@api rest:endpoint:GET:/vueda.vdq/sentitem/} at `/routes/vueda.vdq/sentitem/` lists only items in a done state: `cancelled`, `succeeded`, or `unconfirmed`. Fetching an item that is not done from `/routes/vueda.vdq/sentitem/<id>/` returns `404`.

When another process holds an item's row lock, a send attempt can stop partway. The item can then stay in `queued`, `delayed`, or `sending` with no task behind it. [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md) describes each case. You can cancel a stuck `queued` or `delayed` item, and you can also retry a stuck `delayed` item. A stuck `sending` item has no transition that you can run.

## Retry or Cancel an Item

Run the `retry` or `cancel` transition through the [execute-transition endpoint]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/}. Log in with curl as in [Start Building](../tutorials/start-building.md#verify-the-new-api-endpoints), so `$COOKIE_JAR` and `$CSRF_TOKEN` are set, then send the transition code:

```console
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X PATCH \
  http://localhost:8000/routes/vueda.workflow/workflows/vueda_vdq/queueitem/execute-transition/$QUEUE_ITEM_ID/ \
  -d '{"transition_code": "retry"}'
# Expect: 200 with {"new_state": {"code": "queued", ...}, "new_transitions": [...]}
```

To act on several items at once, send `object_ids` to the [bulk form]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}. In client code, {@api js:method:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow.executeTransition} sends the same request.

What each transition does:

- **Retry** runs from `delayed` or `errored`. It revokes the item's pending Celery retry, if one exists, and clears `task_id`, `retry_delay`, and `result`. The item returns to `queued`, and VDQ publishes a new send task when the request's transaction commits.
- **Cancel** runs from `queued`, `delayed`, or `errored`. It revokes the item's pending Celery retry, if one exists, and moves the item to `cancelled`. The item then leaves the queue list and appears in the sent item list. If a send task for a cancelled `queued` item still runs, the worker logs "Send message task did not execute" and skips it.

A user without `vueda_workflow.read_workflow` or `vueda_vdq.read_queueitem` gets `403`. A missing workflow or transition permission, or a transition that does not run from the item's current state, returns `400`. [Workflow State Permissions](./workflow-state-permissions.md) lists the other responses of this endpoint.

## Resend a Sent Item

Resend creates a new queue item from a sent item and publishes its send task. Send `POST` to the [resend endpoint]{@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}:

```console
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST \
  http://localhost:8000/routes/vueda.vdq/sentitem/$SENT_ITEM_ID/resend/
# Expect: 200 with {"message": "Successfully Queued."}
```

To resend several items, send `{"pks": [1, 2, 3]}` to the [bulk resend endpoint]{@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/} at `/routes/vueda.vdq/sentitem/resend/`. If any ID is not a sent item, the request returns `404` and resends nothing.

[`SentItem.clone`]{@api py:function:vueda.vdq.models.SentItem.clone} builds the new item:

- It copies the sender, receiver, and method.
- For email, it copies the subject, text, HTML, and the `to`, `cc`, and `reply_to` receivers. The new item shares the original's attachment rows. For SMS, it copies the body and media URLs.
- The new item starts in `queued`, with its own task and provider message ID. It keeps no link to the original item or to the original's `origin` record.

## Verify the Setup

1. Set `EMAIL_BACKEND = "anymail.backends.test.EmailBackend"` in `server/config.local.toml`, and restart the worker. Anymail's test backend accepts each message without sending it. The default console backend prints the message, but VDQ then moves the item to `errored`, because that backend reports no Anymail status.
2. Queue an email with `add_email` from `uv run python manage.py shell`.
3. As a user whose groups grant `vueda_vdq.read_queueitem`, fetch the item from `/routes/vueda.vdq/queueitem/<id>/`. Its `workflow_state_code` is `awaiting` once the worker has sent it.
4. Stop the worker, queue another email, and cancel the new item as a user with the cancel permissions. The response's `new_state.code` is `cancelled`.
5. As a user with `vueda_vdq.list_sentitem`, list `/routes/vueda.vdq/sentitem/`. The cancelled item appears there.
6. Resend it as a user with `vueda_vdq.can_resend`, then start the worker. A new queue item appears in `/routes/vueda.vdq/queueitem/`.
