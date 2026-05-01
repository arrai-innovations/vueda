---
title: VDQ and Background Work Model
type: explanation
audience: integrator
status: draft
---

# VDQ and Background Work Model

The {@term VDQ (VUEDA Dispatch Queue)} ({@api py:module:vueda.vdq}) is a Django app that manages outbound email and SMS delivery through a persistent, workflow-backed queue. Each queued item is a database row with an attached workflow state machine; Celery handles asynchronous execution, and external provider callbacks (Anymail signals, Twilio webhooks) reconcile delivery outcomes against the queue item's lifecycle state. The database row is the single coordination point; workers, callbacks, and operator actions all converge on the same `QueueItem` model.

This page explains the persistence and workflow boundary, the transaction and concurrency model, provider dispatch and reconciliation, and done-state semantics for `list` filtering and cleanup. For practical steps using VDQ, see [Run Actions in the VUEDA Dispatch Queue (VDQ)](../guides/vdq-actions). For provider-specific implementation, see [Send Email from VDQ with Anymail](../guides/vdq-email-anymail) and [Send SMS from VDQ with Twilio](../guides/vdq-sms-twilio). For the workflow engine that VDQ builds on, see [Workflow as a Permission Overlay](./workflow-permission-overlay) ({@term Workflow Overlay}).

## Boundary and Authority

VDQ handles email and SMS dispatch through a queued, observable lifecycle. It is not a general-purpose background job framework. VDQ covers a specific set of responsibilities: enqueue, send, track delivery, retry, cancel, and resend. It uses a fixed workflow state machine. The queue item, its workflow state, Celery tasks, and provider callbacks each cover distinct lifecycle aspects. Understanding these boundaries helps clarify failure modes.

**Database rows own persistence and coordination.** The `QueueItem` row is the single source of truth for a queued item's existence, metadata, and operational state. Workers and callbacks read and write queue item fields (`task_id`, `retry_delay`, `result`, provider identifiers) to coordinate without shared memory.

**Workflow state owns lifecycle visibility.** The `QueueItem` model uses `HasWorkflowModelMixin`, so each queue item has an associated workflow state that tracks its position in the dispatch lifecycle. The state is queryable and filterable, and it drives `list`/`detail` endpoint semantics (active queue vs sent history).

**Celery owns task scheduling and retry.** The Celery task layer handles async dispatch timing, transient failure retry with backoff, and worker distribution. Celery does not have a lifecycle state; it updates the queue item's workflow state as a side effect of task execution.

**Provider callbacks own delivery confirmation.** Anymail tracking signals and Twilio webhooks report delivery outcomes asynchronously. These callbacks update the queue item's workflow state to reflect success, failure, or timeout, but they do not control scheduling or retry.

## Persistence and Workflow Boundary

A `QueueItem` is a database row with method-specific detail rows attached by `OneToOneField`. Email items have an associated `AnyMailQueueItem` (which holds `message_id` for Anymail correlation). SMS items have an associated `SMSQueueItem` (which holds `message_sid` for Twilio correlation). The parent `QueueItem` holds shared fields: sender, receiver, method (`"email"` or `"sms"`), result text, `task_id`, `retry_delay`, and `done_since`.

Workflow state is created on first save if missing. The initial state is defined in the workflow's configuration for the QueueItem type. State transitions are applied through the workflow engine by two paths:

- **Permission-checked transitions** (`apply_transition`) are used for interactive operations (operator retry, cancel). These check workflow-level and transition-level permissions.
- **Permission-bypassing transitions** (`fast_transition`) are used for system operations (worker state updates, callback reconciliation). These skip permission checks and operate directly on the workflow state.

The workflow state and transition graph is defined by workflow migrations and stored in workflow tables. States such as `queued`, `sending`, `awaiting`, `delayed`, `errored`, `cancelled`, `succeeded`, and `unconfirmed` are nodes in the graph, and transitions define the allowed movements between these states, each with specific source-state constraints.

## Workflow-backed Lifecycle (Including Ignored Transitions)

The workflow engine enforces `TransitionSource` rules that define which transitions are valid from which states. VDQ uses an additional mechanism: **ignored transition sources**. These are source-state entries marked as no-ops; when a transition is attempted from an ignored source, the engine accepts it without raising `InvalidTransitionError` but does not change state or execute transition hooks.

Ignored sources exist to tolerate late or out-of-band events. For example, if a provider's delivery callback arrives after the queue item has already been cancelled, the system must handle it correctly. Without ignored sources, the callback would attempt a state transition from `cancelled` to `succeeded`. This would fail because `cancelled` is not a valid source for the `succeed` transition. With an ignored source, the callback is accepted silently, and the item remains in `cancelled` state. This way, only valid transitions are allowed, and invalid late events do not disrupt the process.

This design means that late callbacks do not produce errors, but they also do not update the queue item's state. A cancelled item that later receives a delivery confirmation stays cancelled. The delivery information may be logged, but is not reflected in the workflow state.

## Transaction Boundaries and Concurrency

### Enqueue-to-execution boundary

Scheduling uses `send_message.delay_on_commit(...)`, which only publishes the Celery task after the current database transaction commits. This prevents workers from acting on uncommitted rows or on only partially created detail records. If the `QueueItem` row and its detail records are created in a transaction, Celery cannot start until all are committed and visible.

If the broker enqueue fails (Celery broker connectivity issues, serialization errors), the queue item is not silently abandoned. `schedule_queue_item` catches the failure, transitions the queue item to an `errored` state, and records the exception string in the `result` field. This means that enqueue failures are observable from the queue item's state and result, not just from the Celery broker logs.

### Worker-level row locking

`send_message` acquires a row lock using `lock_queue_item` (`SELECT ... FOR UPDATE SKIP LOCKED`) before processing. If the row is already locked by another worker or callback, the task silently skips processing; `SKIP LOCKED` returns no row instead of blocking.

Concurrent workers and callbacks can observe "no row" and skip work. Sometimes, follow-on hooks (like `on_retry`) try to update the queue item after the lock is released. They may miss writing fields like `task_id` or `retry_delay` if the timing is unfavourable. This is a known concurrency edge case, not a data corruption risk. The queue item stays in a valid workflow state, though observability metadata may be incomplete.

## Provider Dispatch and Asynchronous Reconciliation

Email and SMS dispatch follow a common lifecycle pattern:

1. **Worker transitions to `sending`.** The `send_message` task locks the row, transitions to the `sending` state, and dispatches to the method-specific handler.

2. **Send attempt records provider identifiers.** On successful send, the handler records provider-specific identifiers (`message_id` for Anymail, `message_sid` for Twilio) on the method detail row, along with provider status text. The queue item transitions to `awaiting`.

3. **Send failure transitions to `errored`.** Provider-level failures (API errors, authentication failures) transition the queue item to `errored` with the error detail stored in `result`.

4. **Delivery outcomes arrive asynchronously.** Provider confirmation of delivery, bounce, or failure updates the queue item's workflow state to `succeeded`, `errored`, or `unconfirmed`. For email, this happens through Anymail tracking signals (`handle_bounce`). For SMS, this happens through Twilio webhooks or polling.

5. **Late callbacks are tolerated.** Callbacks that arrive after the queue item has moved to a terminal state (e.g., cancelled) are handled via ignored transition sources; they are accepted without error or state change.

Celery auto-retries transient provider failures (`AnymailTransientError`) for email, using `autoretry_for` with configurable backoff. The `QueueProcessor.on_retry` callback records `task_id` and `retry_delay` on the queue item, then transitions it to `delayed`. Non-transient failures go to the task failure handler, which appends the traceback to `result` and switches to `errored`.

For SMS, delivery confirmation can be provided via a webhook callback or periodic polling, depending on configuration. When `TWILIO_WEBHOOK_URL` is set, the webhook handles status updates, and the periodic task checks only for timeouts. Without the webhook URL, the periodic task polls Twilio for awaiting messages and updates their states.

## Done-state Semantics and Cleanup Gating

VDQ defines a set of terminal workflow states, `QUEUE_ITEM_DONE_STATES`, that drive three behaviours:

**`list` endpoint filtering.** The active queue `list` endpoint (`/vueda.vdq/queueitem/`) excludes items whose workflow state is in the done set. The sent history endpoint (`/vueda.vdq/sentitem/`) is a proxy for the same table, filtered to only done-state items. Detail fetch by PK works regardless of state.

**Proxy model selection.** `SentItem` is a proxy model for `QueueItem` filtered to done states. The split enables separate viewsets, serializers, and permissions for active queue management vs sent-item history.

**Attachment cleanup gating.** Attachment file deletion is gated on all referencing queue items being in a done state. An attachment shared across multiple queue items (e.g., the same file sent to multiple recipients) is not deleted until every linked queue item has reached a done state. Automatic cleanup on entering a done state is configuration-gated: it only runs when `VDQ_MAX_FILES_AGE_IN_SECONDS == 0` and is skipped during dry-run transitions. Non-zero age values are not acted on by VDQ; the package provides immediate-or-nothing cleanup, not scheduled cleanup.

## Observability Surfaces and Failure Modes

**Queue and sent-item endpoints.** Operator-facing status is available through read-only `list`/`detail` endpoints for both active queue items and sent history. Default VDQ viewsets inherit `VuedaReadOnlyViewSet`, so the baseline surface is read-only with explicit extra actions (resend) added by the decorator.

**Resend.** Resend clones a done `SentItem` into a new `QueueItem` in the workflow initial state and schedules it. Clones include method-specific detail rows and relationships. The resend action is permission-gated (`vueda_vdq.can_resend`).

**Attachment URLs.** Attachment download URLs are derived from `settings.VDQ_URL` and served by `PrivateAttachmentView`, which requires authentication. Note that the view enforces authentication but does not perform object-level permission checks against the associated queue item; any authenticated user can fetch an attachment by ID if they can obtain or guess the URL.

**Enqueue failure is observable.** Broker failures during `schedule_queue_item` are not silent. The queue item transitions to `errored` and stores the exception text in `result`. No Celery task is created.

**`done_since` anchoring.** The `done_since` field is used as the SMS timeout age basis in Twilio polling, but it is not automatically updated by VDQ workflow transitions. The timeout age is anchored to the value set at row creation or by explicit code paths that update the field. Unexpected drift in `done_since` can move items into timeout handling sooner or later than expected.

**Row-lock contention.** `lock_queue_item` uses `SKIP LOCKED`, so concurrent access does not block, it skips. Workers who cannot acquire the lock silently move on. This prevents deadlocks but means that in high-contention scenarios, some task executions may be silently skipped and must be retried by Celery's retry mechanism or periodic polling.

## Relevant Implementation Surface

- {@api py:module:vueda.vdq}
- {@api py:property:vueda.vdq.celery_app}
- {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.fast_available_transitions}
- {@api py:function:vueda.workflow.models.HasWorkflowModelMixin.fast_transition}
- {@api rest:endpoint:GET:/vueda.vdq/queueitem/}
- {@api rest:endpoint:GET:/vueda.vdq/sentitem/}
- {@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/}
- {@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}
- {@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/}
- {@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}
