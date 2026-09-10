---
title: Run Actions in the VUEDA Dispatch Queue (VDQ)
type: how-to
audience: integrator
status: draft
---

# Run Actions in the VUEDA Dispatch Queue ({@term VDQ (VUEDA Dispatch Queue)})

This guide covers implementing queue-backed execution for outbound email and SMS through VDQ, from queue item creation through async processing, retry/cancel/resend operations, and operator-facing status. It focuses on the shared patterns across both email and SMS; for provider-specific details, see [Send Email from VDQ with Anymail](./vdq-email-anymail) and [Send SMS from VDQ with Twilio](./vdq-sms-twilio).

The guide assumes familiarity with VDQ's persistence and lifecycle model. If you have not read [VDQ and Background Work Model](../core-concepts/vdq-and-background-work), start there; it explains the workflow state machine, transaction boundaries, and provider reconciliation patterns within which this guide operates.

## Goal and Preconditions

The objective is a queue-backed flow where:

- Work that should not block request-response paths (email/SMS delivery) is enqueued as a {@term Queue Item (VDQ)} and processed asynchronously.
- Enqueue failures are observable through queue item state and metadata, not silently dropped.
- Retry, cancel, and resend operations are available through workflow transitions and viewset actions.
- Operator-facing status is available through read-only `list`/`detail` endpoints.

Before you begin:

Celery must be configured and running. VDQ uses `delay_on_commit` for task scheduling, which requires a working Celery broker and Django database transaction support.

The `vueda.vdq` app must be in `VUEDA_APPS`, and `vueda.workflow` with it. VDQ is optional, so only an application that uses the features in this guide needs it. A configuration that installs VDQ without workflow raises `ImproperlyConfigured` at startup. [Django App Boundaries](../core-concepts/architecture-overview#django-app-boundaries) covers the supported combinations. Apply the VDQ workflow through migrations; VDQ's migration files define the `QueueItem` state machine.

For email: Anymail must be configured with a valid provider backend. For SMS: Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) must be set.

## Queue Item Creation

Use the scheduler entrypoints to create queue items with validated payloads:

**`add_email(...)`** creates one `QueueItem(method="email")` per recipient (across `to`, `cc`, and `bcc` inputs) plus associated `AnyMailQueueItem` detail rows, and immediately schedules async processing. Sender and receiver roles must have email values; `validate_email_role` enforces this before queueing.

**`add_sms(sender, receiver, body)`** creates one `QueueItem(method="sms")` plus one `SMSQueueItem`, and immediately schedules async processing. Both sender and receiver must have a `cell` value; `validate_sms_role` enforces this.

**`add_abstract_email(...)`** creates the queue item and detail records without immediate scheduling. Use this when you need to create the queue item in one transaction and schedule it later (e.g., after additional setup or validation).

Each {@term Queue Item (VDQ)} receives the workflow's initial state on creation. The `QueueItem` row holds shared fields (sender, receiver, method, result, task metadata), while method-specific detail rows hold provider-specific data (Anymail `message_id`, Twilio `message_sid`).

## Scheduling and Worker Dispatch

`schedule_queue_item(...)` publishes a Celery task using `send_message.delay_on_commit(...)`. The task is published only after the current database transaction commits, preventing workers from racing on uncommitted rows.

If the broker's enqueue fails (due to connectivity issues or serialization errors), the queue item transitions to `errored`, and the exception text is stored in the `result` field. The failure is persistent and observable, not silently dropped.

On the worker side, `send_message` acquires a row lock (`SELECT ... FOR UPDATE SKIP LOCKED`) before processing. If the lock cannot be acquired (another worker or callback holds it), the task silently skips the item. This prevents deadlocks at the cost of occasional skipped processing, which is recovered by Celery retry or periodic tasks.

The worker transitions the queue item to `sending`, then dispatches to the method-specific handler:

- **Email**: `send_email` constructs and sends an `EmailMultiAlternatives` message through Anymail. On success, records `message_id` and transitions to `awaiting`. On failure, records error detail and transitions to `errored`.
- **SMS**: `send_sms` calls `twilio_client.messages.create(...)`. On success, records `message_sid` and status text, transitions to `awaiting`. On Twilio API failure, transitions to `errored`.

For transient email failures, the Celery task auto-retries with backoff. The `QueueProcessor.on_retry` callback records `task_id` and `retry_delay` on the queue item and transitions it to `delayed`. Non-transient failures propagate to `on_failure`, which appends traceback text to `result` and transitions to `errored`.

## Retry and Cancel Flow

Retry and cancel operations run through the workflow execute-transition endpoint on `QueueItem`. These are permission-checked transitions; they use `apply_transition`, not `fast_transition`.

**Retry** (non-dry-run): cancels the prior Celery task if one is tracked (`task_id`), clears `task_id`, `retry_delay`, and `result` fields, then re-schedules the queue item via `schedule_queue_item`. The queue item returns to the processing pipeline from the beginning.

**Cancel**: transitions the queue item to the `cancelled` state. Late provider callbacks (delivery confirmations that arrive after cancellation) are handled via ignored transition sources; they are accepted without error or state change.

Both operations require appropriate workflow-level and transition-level permissions. The `QueueItem` model defines `can_cancel` and `can_retry` permission references, but the enforcement path is workflow-dependent. Verify permission behaviour through the execute-transition endpoint, not through direct model method calls.

Retry and cancel assume the underlying operation is idempotent. VDQ does not enforce idempotency at the framework layer. If your email/SMS provider does not handle duplicate sends gracefully, build deduplication into your send handler.

## Sent Item Resend Flow

Resend operates on completed items in the sent history, not on active queue items. `SentItem.clone()` creates a new `QueueItem` in the workflow initial state, duplicating the sender, receiver, method, and available method-specific detail rows (AnyMail detail, SMS detail). The clone is then scheduled via `schedule_queue_item`. This history surface is the {@term Sent Item (VDQ)} contract.

Resend is exposed as an explicit extra action on the sent-item viewset, gated by the `vueda_vdq.can_resend` permission. Both single-item resend (by PK) and bulk resend are available.

The cloned item is a fully independent queue item; it gets its own workflow state, Celery task, and provider correlation identifiers. There is no link back to the original sent item beyond sharing the same sender/receiver/content.

## Status Surfaces and Callbacks

**Active queue endpoint** (`/vueda.vdq/queueitem/`): lists queue items not in done states. Provides operator visibility into items that are queued, sending, awaiting, delayed, or errored.

**Sent history endpoint** (`/vueda.vdq/sentitem/`): lists queue items in done states (cancelled, succeeded, unconfirmed). Provides history visibility.

**`detail` endpoints**: both queue and sent-item `detail` endpoints resolve items by PK regardless of state.

**Attachment endpoint** (`/vueda.vdq/attachments/{id}/`): serves attachment files with authentication required. The view does not perform object-level permission checks; any authenticated user can fetch an attachment by ID.

**Twilio webhook** (`/vueda.vdq/twilio-status-callback/`): accepts Twilio status updates with signature validation. Known `MessageSid` values update the corresponding queue item. Unknown SIDs trigger a deferred lookup task.

Default VDQ viewsets inherit `VuedaReadOnlyViewSet`, so the baseline surface is read-only. Extra actions (resend) are explicitly added by the decorator.

## Verification Checklist

After implementing VDQ flows, verify:

- Queue item creation succeeds with valid sender/receiver payloads.
- Role validation rejects invalid sender/receiver data before queueing.
- Broker enqueue failures produce an `errored` queue item with a recorded exception, not a silent failure.
- Worker dispatch acquires the row lock and transitions through `sending` to `awaiting` on success.
- Provider failures transition to `errored` with descriptive `result` text.
- Retry clears prior task metadata and re-schedules successfully.
- Cancel transitions to `cancelled` and late callbacks do not raise errors.
- Resend clones a sent item and schedules a new independent queue item.
- Active queue list excludes done-state items; sent history list includes only done-state items.

## Known Gaps

**Cancel/retry permission enforcement is workflow-path dependent.** The `can_cancel`/`can_retry` permission references on `QueueItem` are not independently codename-enforced in VDQ viewset tests. Permission behaviour flows through the workflow execute-transition path, which has its own permission gates.

**`VuedaViewSet` + `ReadOnlyModelViewSet` inheritance conflict.** Custom queue/sent viewset overrides that combine `VuedaViewSet` with `ReadOnlyModelViewSet` can accidentally reintroduce writable action methods and schema noise. VUEDA core now emits a runtime warning for this inheritance pattern. Use `VuedaReadOnlyViewSet` instead.

**Retry/cancel idempotency is not framework-enforced.** VDQ does not prevent duplicate sends if a retry races with a previous send attempt that is still in flight. Build deduplication into provider-specific handlers if needed.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.vdq}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
- REST:
    - {@api rest:endpoint:GET:/vueda.vdq/queueitem/}
    - {@api rest:endpoint:GET:/vueda.vdq/sentitem/}
    - {@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/}
    - {@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}
    - {@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}
    - {@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/}
    - {@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}
    - {@api rest:schema:DefaultQueueItem}
    - {@api rest:schema:DefaultSentItem}
