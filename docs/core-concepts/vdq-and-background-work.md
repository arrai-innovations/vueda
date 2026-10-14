---
title: VDQ and Background Work Model
type: explanation
audience: integrator
status: draft
---

# VDQ and Background Work Model

The {@term VDQ (VUEDA Dispatch Queue)} ({@api py:module:vueda.vdq}) is VUEDA's Django app for outbound email and SMS. Each message to one receiver is a {@term Queue Item}: a database row with a workflow state. A Celery worker sends it, provider callbacks record the delivery result on it, and operators retry, cancel, or resend it through the API. All of them read and write the same row.

This page describes that row and its workflow, the transaction and locking rules, how provider results arrive, done states, and the known limitations. [Set Up and Operate the VUEDA Dispatch Queue (VDQ)](../guides/vdq-actions) covers setup and operator tasks. [Send Email from VDQ with Anymail](../guides/vdq-email-anymail) and [Send SMS from VDQ with Twilio](../guides/vdq-sms-twilio) cover each provider.

## Persistence and Workflow Boundary

A {@api py:class:vueda.vdq.models.QueueItem} row holds the fields that every method shares: the sender, the receiver, [`method`]{@api py:function:vueda.vdq.models.QueueItem.method} (`email` or `sms`), [`result`]{@api py:function:vueda.vdq.models.QueueItem.result}, [`task_id`]{@api py:function:vueda.vdq.models.QueueItem.task_id}, [`retry_delay`]{@api py:function:vueda.vdq.models.QueueItem.retry_delay}, and [`done_since`]{@api py:function:vueda.vdq.models.QueueItem.done_since}. A one-to-one detail row holds the message content and the provider's ID for the sent message:

- {@api py:class:vueda.vdq.models.AnyMailQueueItem} holds the subject, the bodies, the attachments, and Anymail's [`message_id`]{@api py:function:vueda.vdq.models.AnyMailQueueItem.message_id}.
- {@api py:class:vueda.vdq.models.SMSQueueItem} holds the body and Twilio's [`message_sid`]{@api py:function:vueda.vdq.models.SMSQueueItem.message_sid}.

Provider callbacks find the queue item by that ID. An email item can also link to the record that caused it, through the [`origin`]{@api py:param:vueda.vdq.schedulers.add_email.origin} argument of {@api py:function:vueda.vdq.schedulers.add_email}. The link is a {@api ext:django:django.contrib.contenttypes.fields.GenericForeignKey}.

`QueueItem` is a {@term Workflow-Enabled Model}. VDQ's {@term Workflow Migration} files define its workflow, and each new item gets an {@term Object State} in `queued`. Transitions reach an item by two paths:

- Server code (the worker, the send handlers, and the provider callbacks) applies each transition as a {@term Fast Transition}, without permission checks.
- Operators apply `retry` and `cancel` through the [execute-transition endpoint]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/}, which checks permissions.

## Workflow-backed Lifecycle (Including Ignored Transitions)

The workflow has eight states. `queued` is the initial state. `cancelled`, `succeeded`, and `unconfirmed` form the {@term Done State} set. `errored` is not a done state, so an errored item stays in the active queue until someone retries or cancels it.

| Transition | From                                       | To            | Applied when                                                                  | Transition permission  |
| ---------- | ------------------------------------------ | ------------- | ----------------------------------------------------------------------------- | ---------------------- |
| `send`     | `queued`, `delayed`                        | `sending`     | The worker starts a send attempt.                                             | None                   |
| `await`    | `sending`                                  | `awaiting`    | The provider accepts the message, or a status update reports it in flight.    | None                   |
| `delay`    | `sending`, `awaiting`                      | `delayed`     | Celery schedules an automatic retry after a transient email error.            | None                   |
| `error`    | `queued`, `sending`, `awaiting`, `delayed` | `errored`     | Publishing the task fails, the send fails, or the provider reports a failure. | None                   |
| `succeed`  | `sending`, `awaiting`                      | `succeeded`   | The provider reports delivery.                                                | None                   |
| `timeout`  | `awaiting`                                 | `unconfirmed` | An SMS has no final status when its timeout passes.                           | None                   |
| `retry`    | `delayed`, `errored`                       | `queued`      | An operator retries the item.                                                 | `vueda_vdq.can_retry`  |
| `cancel`   | `queued`, `delayed`, `errored`             | `cancelled`   | An operator cancels the item.                                                 | `vueda_vdq.can_cancel` |

The workflow's one {@term Workflow Permission} is `vueda_vdq.list_queueitem`. To run `retry` or `cancel` through the endpoint, a user needs that permission and the transition's {@term Transition Permission}. The endpoint also applies the gates that [Which Gate Each Workflow Endpoint Applies](./workflow-permission-overlay#which-gate-each-workflow-endpoint-applies) lists, so the user also needs `vueda_vdq.read_queueitem` and `vueda_workflow.read_workflow`. The other six transitions have no transition permission, so the endpoint refuses them for every user.

[`QueueItem.on_transition`]{@api py:function:vueda.vdq.models.QueueItem.on_transition} adds work to some transitions:

- `retry` and `cancel` revoke the Celery task recorded in `task_id`, if there is one, and clear `task_id` and `retry_delay`.
- `retry` also clears `result` and schedules a new send attempt.
- A transition into a done state deletes attachment files when cleanup is on, as [Done-state Semantics and Cleanup Gating](#done-state-semantics-and-cleanup-gating) describes.

`cancel` accepts only items that no send attempt is working on. A `queued` item has no task ID in `task_id`, so `cancel` does not revoke its send task, and that task still runs. The worker finds the item cancelled and drops the task.

### Ignored transitions and late events

A {@api py:class:vueda.workflow.models.TransitionSource} row can be marked [`ignored`]{@api py:function:vueda.workflow.models.TransitionSource.ignored}. A fast transition from an ignored source keeps the current state, skips `on_transition`, and calls [`on_transition_ignored`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.on_transition_ignored}.

VDQ marks two sources ignored: `succeed` and `error` from `cancelled`. A delivery or failure event for a cancelled item therefore leaves the item cancelled. The handler writes the event's text to `result` before the transition, so `result` still changes.

A provider event whose transition has no source in the item's current state raises {@api py:class:vueda.workflow.exceptions.InvalidTransitionError}. A failure event for a `succeeded` item is one example. The handler's transaction rolls back, so the item keeps its state and `result`, and the webhook request fails with `500`.

## Transaction Boundaries and Concurrency

### Enqueue-to-execution boundary

`add_email`, {@api py:function:vueda.vdq.schedulers.add_sms}, resend, and `retry` all call {@api py:function:vueda.vdq.schedulers.schedule_queue_item}. It registers the publish of the {@api py:function:vueda.vdq.tasks.send_message} task with {@api ext:django:django.db.transaction.on_commit}. The task reaches the broker only after the surrounding transaction commits, so a worker never reads an item whose rows are uncommitted. If the transaction rolls back, VDQ publishes nothing.

If the publish fails with a {@api ext:celery:kombu.exceptions.OperationalError} or a {@api ext:celery:celery.exceptions.CeleryError}, VDQ moves the committed item to `errored`. The error text goes in `result`.

### Worker-level row locking

Each step that changes a queue item first locks the item's row. Workers, provider callbacks, and operator transitions therefore change an item one at a time. VDQ takes the lock with {@api py:function:vueda.vdq.utils.with_locked_queue_item} for these steps:

- `send_message`, which applies `send`.
- The step in `send_email` or `send_sms` that records the provider's ID and the outcome.
- The task's `on_retry` and `on_failure` hooks.

A send attempt holds the lock twice, briefly. The worker locks the row to apply `send`, then calls the provider without a lock. The send handler then locks the row again to record the result.

`with_locked_queue_item` waits up to 5 seconds for a row that another transaction holds. On a PostgreSQL-family engine, {@api py:function:vueda.core.default_settings.get_defaults} sets the REPEATABLE READ isolation level. At that level, a transaction that waited for the lock fails with a serialization error when the holder changed the row. VDQ then runs the step again in a new transaction, which reads what the holder committed. A lock timeout or a deadlock also starts a new attempt, up to 3 attempts in all. If an operator cancelled the item in the meantime, the new attempt finds it cancelled and stops.

When all 3 attempts fail, `with_locked_queue_item` raises {@api py:class:vueda.vdq.exceptions.QueueItemLockError}:

- `send_message` retries its task after 10 seconds, and the item stays `queued` or `delayed`. This retry counts toward the task's limit of 12 retries.
- In `send_email` and `send_sms`, the provider has already accepted the message. The error names the provider's ID, and `on_failure` stores it in `result` and applies `error`. A `retry` of such an item sends the message again.
- `on_retry` and `on_failure` log the error and leave the item unchanged.

The periodic SMS checks do not wait. The timeout check skips an item whose row is held, continues with the rest, and checks the skipped item again on its next run. The polling task also skips a held row, and its next run sees the message again. The Anymail tracking handler and the Twilio status callback also wait for the lock, without the 5-second limit.

## Provider Dispatch and Asynchronous Reconciliation

`send_message` calls {@api py:function:vueda.vdq.handlers.send_email} or [`send_sms`]{@api py:function:vueda.vdq.handlers.TwilioQueueItemHandler.send_sms}, which record the outcome on the item:

- **Accepted.** The handler stores `message_id` or `message_sid` and applies `await`. For email, Anymail must report the message as `sent` or `queued`. Any other Anymail status applies `error`. If a status update has already moved the item out of `sending`, the handler stores the ID and changes nothing else.
- **Rejected by Twilio.** `send_sms` records Twilio's error in `result` and applies `error`.
- **Transient email error.** For HTTP status 5xx, `408`, `423`, or `429`, `send_email` raises {@api py:class:vueda.vdq.exceptions.AnymailTransientError}, and Celery retries the task.
- **Any other exception.** The task's [`on_failure`]{@api py:function:vueda.vdq.tasks.QueueProcessor.on_failure} hook appends the traceback to `result` and applies `error`.

{@api py:class:vueda.vdq.tasks.BaseTask} sets the retry policy. Its {@api ext:celery:Task.autoretry_for} is `AnymailTransientError`, with up to 12 retries and exponential backoff from 16 seconds, without jitter. Before each retry, [`on_retry`]{@api py:function:vueda.vdq.tasks.QueueProcessor.on_retry} records the task ID and the delay. If the item is in `sending`, `on_retry` then applies `delay`. The retried task applies `send` from `delayed`. When the retries run out, `on_failure` applies `error`. SMS sends have no automatic retry after a provider error.

Delivery results arrive later:

- **Email.** Anymail's tracking webhook passes each event to {@api py:function:vueda.vdq.handlers.handle_bounce}.
- **SMS.** The Twilio status callback ({@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}) or a polling task passes each status to [`update_sms_qi`]{@api py:function:vueda.vdq.handlers.TwilioQueueItemHandler.update_sms_qi}. The `TWILIO_WEBHOOK_URL` setting selects which.

[Matching a status update to its queue item](#matching-a-status-update-to-its-queue-item) describes how each update finds its item. The provider guides map each event and status to a transition.

An SMS item still `awaiting` after `VDQ_TWILIO_SMS_TIMEOUT_HOURS` (2 by default) moves to `unconfirmed`. The window counts from `done_since`, which VDQ sets when it creates the row and never changes. A retried item keeps its original window. A resent item is a new row with a new window.

The SMS polling and timeout checks are periodic tasks on VDQ's own Celery app, {@api py:module:vueda.vdq.celery}. When `TWILIO_ACCOUNT_SID` is set, {@api py:function:vueda.vdq.celery.setup_periodic_tasks} registers one of them to run every 30 seconds. They run only while Celery beat runs. [Send SMS from VDQ with Twilio](../guides/vdq-sms-twilio) describes both modes and the worker command.

### Matching a status update to its queue item

A status update names the message by the provider's ID: Twilio's `MessageSid` or Anymail's `message_id`. VDQ first looks for the queue item that stores that ID. The send handler stores the ID only after the provider accepts the message, so an update can arrive first. A worker that stops between the two steps never stores it. For these cases, the send handler also gives the provider the queue item's primary key, and the provider returns the key with each update:

- **Twilio.** `send_sms` adds the key to the `status_callback` URL as the `queue_item` query parameter. Twilio posts each status update to that URL. Twilio's signature covers the full URL, including the query string, so the endpoint returns `403` for a request with a changed key.
- **Email.** `send_email` passes the email to an email tracking strategy, which attaches the key. The default strategy, {@api py:class:vueda.vdq.tracking.MetadataEmailTrackingStrategy}, stores the key under `vdq_queue_item` in the email's Anymail `metadata`. Anymail sends `metadata` to the ESP, and some ESPs return it on tracking events. In the Anymail version that VUEDA depends on, those ESPs are Amazon SES, Brevo, Mailgun, Mailjet, Mailtrap, Mandrill, Postmark, Resend, SendGrid, SparkPost, and Unisender Go. The [Anymail ESP feature matrix](https://anymail.dev/en/stable/esps/) lists them for the version that you run.

VDQ uses the key only when no item stores the update's provider ID. When the key finds an item that stores no provider ID, VDQ stores the ID from the update and then applies the status. When the item stores a different provider ID, VDQ logs the update and changes nothing.

An item that the key finds is usually still in `sending`. The handlers apply each status from `sending` as follows:

- A final status applies `succeed` or `error`, which the workflow allows from `sending`. For Twilio, `delivered` succeeds, and `undelivered` and `failed` error. For Anymail, `delivered` succeeds, and `bounced`, `rejected`, and `failed` error.
- An in-flight status applies `await`. For Twilio, the in-flight statuses are `queued`, `sending`, and `sent`. For Anymail, they are `queued`, `sent`, and `deferred`. The item then waits in `awaiting` for a final status or the SMS timeout.
- Any other status leaves the item in `sending`.

When the key finds no item, or the update carries no key, the Twilio endpoint queues a deferred lookup task. [Send SMS from VDQ with Twilio](../guides/vdq-sms-twilio) describes that task. `handle_bounce` logs the event as a warning and drops it.

When the update arrives first, the send handler later stores the provider ID but keeps the state and `result` that the update set. For example, the error text from an `undelivered` callback stays in `result`.

#### Email tracking strategies

The `VDQ_EMAIL_TRACKING_STRATEGY` setting holds the email tracking strategy class or its dotted import path. Without the setting, VDQ uses `MetadataEmailTrackingStrategy`. The base class, {@api py:class:vueda.vdq.tracking.EmailTrackingStrategy}, is also the no-op strategy. It attaches nothing and finds no item. With the no-op strategy, tracking events match by `message_id` only.

A custom strategy subclasses `EmailTrackingStrategy` and implements two methods:

- [`attach(email, queue_item)`]{@api py:function:vueda.vdq.tracking.EmailTrackingStrategy.attach} adds tracking data to the email before VDQ sends it.
- [`find_queue_item(event)`]{@api py:function:vueda.vdq.tracking.EmailTrackingStrategy.find_queue_item} reads the tracking data from a tracking event and returns the queue item. It returns `None` when the event identifies no item.

For example, a strategy for an ESP that returns tags but not metadata can carry the key in a tag. `handle_bounce` locks the item that the strategy returns and runs the provider ID check itself, so a custom strategy cannot skip that check.

Some ESPs accept no metadata. For such an ESP, Anymail raises `AnymailUnsupportedFeature` while it builds the request, before it contacts the ESP. `send_email` logs the exception at info level, then builds the email again without tracking data and sends it. The ESP receives the email once, and its tracking events match by `message_id` only. With Anymail's `IGNORE_UNSUPPORTED_FEATURES` setting on, Anymail drops the metadata without raising, and the first attempt sends the email. [ESPs without metadata support](../guides/vdq-email-anymail#esps-without-metadata-support) shows how to select the no-op strategy for such an ESP.

## Done-state Semantics and Cleanup Gating

Done states decide which endpoint lists an item, which items the resend endpoints accept, and when VDQ deletes attachment files.

**Queue and sent-item endpoints.** The [queue item list]{@api rest:endpoint:GET:/vueda.vdq/queueitem/} leaves out done items, and retrieving a queue item by ID works in any state. {@api py:class:vueda.vdq.models.SentItem} is a proxy model of the same table. Its manager keeps only done items, so the [sent item list]{@api rest:endpoint:GET:/vueda.vdq/sentitem/} and sent item retrieval show only done items. Both default viewsets subclass {@api py:class:vueda.core.viewsets.VuedaReadOnlyViewSet} and accept no writes. The `SEND_QUEUE_VIEWSET` and `SENT_ITEM_VIEWSET` settings can replace them. A replacement that combines {@api py:class:vueda.core.viewsets.VuedaViewSet} with {@api ext:drf:rest_framework.viewsets.ReadOnlyModelViewSet} emits a `RuntimeWarning` when Python defines the class.

**Resend.** The [single]{@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/} and [bulk]{@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/} resend endpoints call [`SentItem.clone`]{@api py:function:vueda.vdq.models.SentItem.clone} on each sent item and schedule the copy. Both check one permission, `vueda_vdq.can_resend`. The copy is a new queue item in `queued` with the same sender, receiver, method, and content. For email, it also gets the `to`, `cc`, and `reply_to` rows and shares the original's attachment rows. The copy has no origin link.

**Attachment cleanup.** With `VDQ_MAX_FILES_AGE_IN_SECONDS = 0`, an item that enters a done state deletes the file of each of its attachments whose linked items are all done. The attachment row stays. A {@term Dry Run} transition deletes nothing. With any other value, or with the setting unset, VDQ keeps attachment files.

## Failure Modes and Known Limitations

::: warning
{@api py:class:vueda.vdq.views.PrivateAttachmentView} serves {@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/} to any signed-in user. It does not check the user's access to the attachment's queue items, so any signed-in user can download any attachment by its ID. Attachment IDs are sequential integers. This is server behavior, and hiding download links in the UI does not change it.
:::

**Lock contention.** A step that waits for a row lock can hold its Celery worker for about 15 seconds: three waits of up to 5 seconds. When `on_retry` or `on_failure` cannot lock the row in 3 attempts, the item can stay in `sending`. After a failed `on_retry`, the retried task finds the item in `sending`, which is not a source for `send`, and drops itself. `sending` is a source for neither `retry` nor `cancel`, so an item stuck there stays in the active queue. If the provider accepted the message, a later status update can still find the item by its key and move it out of `sending`.

**Repeated sends.** Each send attempt, automatic or through `retry`, calls the provider again without a deduplication key. If an attempt fails after the provider accepted the message, the next attempt can deliver it a second time.

**Late provider events.** Only a cancelled item absorbs a late delivery or failure event, as [Ignored transitions and late events](#ignored-transitions-and-late-events) describes. Other late events fail the webhook request.

**Twilio polling scope.** In polling mode, each run lists every message in the Twilio account sent since the day the oldest `awaiting` SMS item was queued. The list includes messages that other applications sent from the same account.

**Resend after attachment cleanup.** With cleanup on, resending an email whose attachment files were deleted fails. The send cannot read the files, and the new item moves to `errored`.

**Origin keys.** The origin link stores the origin's primary key in a {@api ext:django:django.db.models.PositiveSmallIntegerField}. `add_email` fails when the origin's primary key is above 32767 or is not an integer.
