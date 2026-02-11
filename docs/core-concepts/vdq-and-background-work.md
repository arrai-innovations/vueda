---
title: VDQ and Background Work Model
type: explanation
audience: implementor
status: briefing
---

# VDQ and Background Work Model

## Intent and Scope

- Define the server-side dispatch-queue contract implemented by the `vueda.vdq` Django app: persistence model, workflow-backed state machine, and Celery execution boundary.
- Define which components own lifecycle authority (DB rows, workflow state, Celery tasks, provider callbacks) and how those authorities interact under concurrency.
- Define done-state semantics as implemented (filtering, proxy models, and cleanup gating).
- Define observable failure modes at the enqueue, send, and callback/polling layers.
- Source anchors: `server/vueda/vdq/models.py`, `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/serializers.py`, `server/vueda/vdq/views.py`, `server/vueda/vdq/constants.py`, `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py`, `server/vueda/vdq/migrations/0005_workflow_migrations_2025_11_21.py`, `server/vueda/workflow/models.py`, `server/tests/unit/vdq/test_models.py`, `server/tests/unit/vdq/test_handlers.py`, `server/README.md`.

## Non-goals

- Not a how-to for configuring Celery, Anymail, Twilio, or environment variables.
- Not a general background job abstraction beyond the `vueda.vdq` package’s current responsibilities (email/SMS dispatch and related callbacks).
- Not a UX specification for “queue views” or admin dashboards.
- Not a guarantee of delivery semantics beyond what is enforced by workflow transitions and locking in code.

## Key Concepts

### `QueueItem` is the persistence and workflow boundary

- What it is: a database row (`QueueItem`) with an attached workflow state (`HasWorkflowModelMixin`), plus method-specific detail rows (`AnyMailQueueItem`, `SMSQueueItem`) keyed by `OneToOneField`. Anchors: `server/vueda/vdq/models.py`, `server/vueda/workflow/models.py`, `server/tests/unit/vdq/test_models.py`.
- Why it exists: persistence is the single coordination point for async workers and external callbacks; workflow state is the normal form for lifecycle visibility and transitions. Anchors: `server/vueda/workflow/models.py`, `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py`.
- Where it lives: Django models under `server/vueda/vdq/models.py` and workflow state under `server/vueda/workflow/models.py`. Anchors: `server/vueda/vdq/models.py`, `server/vueda/workflow/models.py`.

### Workflow state is the lifecycle contract surface

- What it is: a content-type-scoped workflow named `queueitem` with explicit states and transition sources; state changes are applied via `fast_transition(...)` in background code paths. Anchors: `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py`, `server/vueda/workflow/models.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`.
- Why it exists: background work and provider callbacks need a shared, queryable lifecycle model with permission-checked (interactive) and permission-bypassing (system) execution paths. Anchors: `server/vueda/workflow/models.py`, `server/vueda/vdq/viewsets.py`.
- Where it lives: workflow engine in `server/vueda/workflow/models.py`; VDQ workflow definitions in `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py` and follow-up `server/vueda/vdq/migrations/0005_workflow_migrations_2025_11_21.py`. Anchors: `server/vueda/workflow/models.py`, `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py`, `server/vueda/vdq/migrations/0005_workflow_migrations_2025_11_21.py`.

### Enqueue-to-execution crosses a transaction boundary

- What it is: scheduling uses `send_message.delay_on_commit(...)` so the Celery task is published only after the DB transaction commits. Anchors: `server/vueda/vdq/schedulers.py`.
- Why it exists: tasks must not race on uncommitted rows or partially-created method detail records. Anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/models.py`.
- Where it lives: `schedule_queue_item(...)` and `add_email(...)` / `add_sms(...)` entrypoints. Anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/models.py`.

### Retry is Celery-driven for transient email errors, state-driven for operators

- What it is: email transient failures raise `AnymailTransientError`, which is auto-retried by Celery (`autoretry_for`); `QueueProcessor.on_retry(...)` records `task_id`/`retry_delay` and updates the queue item’s workflow state to reflect the retry. Anchors: `server/vueda/vdq/exceptions.py`, `server/vueda/vdq/tasks.py`.
- Why it exists: retry scheduling is delegated to Celery while lifecycle/visibility remains in the database via workflow state and fields. Anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/models.py`.
- Where it lives: Celery task base classes in `server/vueda/vdq/tasks.py`; per-item fields `task_id` and `retry_delay` on `QueueItem`. Anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/models.py`.

### Provider confirmation is out-of-band and can arrive late

- What it is: email confirmation/error signals are handled via `anymail.signals.tracking` (`handle_bounce(...)`); SMS confirmation/error comes from Twilio polling and/or webhook callbacks and updates workflow state. Anchors: `server/vueda/vdq/handlers.py`, `server/vueda/vdq/views.py`, `server/tests/unit/vdq/test_handlers.py`.
- Why it exists: a “send” call does not imply delivery; delivery outcomes are reconciled asynchronously against the `QueueItem`. Anchors: `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_handlers.py`.
- Where it lives: provider adapters and reconciliation in `server/vueda/vdq/handlers.py`; webhook endpoint in `server/vueda/vdq/views.py`. Anchors: `server/vueda/vdq/handlers.py`, `server/vueda/vdq/views.py`.

### “Done” is a named set of terminal-ish workflow states

- What it is: done states are defined by `QUEUE_ITEM_DONE_STATES` and are used for list filtering, proxy model selection, and attachment cleanup gating. Anchors: `server/vueda/vdq/constants.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/models.py`.
- Why it exists: VDQ splits “active queue” vs “sent/done history” on a stable state set, not on timestamps. Anchors: `server/vueda/vdq/constants.py`, `server/vueda/vdq/viewsets.py`.
- Where it lives: constant in `server/vueda/vdq/constants.py` and consumers across VDQ code. Anchors: `server/vueda/vdq/constants.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/models.py`.

## Relevant Implementation Surface

- `{@api py:module:vueda.vdq}`
- `{@api py:property:vueda.vdq.celery_app}`
- `{@api rest:endpoint:GET:/vueda.vdq/queueitem/}`
- `{@api rest:endpoint:GET:/vueda.vdq/sentitem/}`
- `{@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/}`
- `{@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}`
- `{@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/}`
- `{@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}`

## Contracts and Invariants

- `QueueItem` workflow state is created on first save if missing; initial workflow state is defined by the workflow’s configured initial state for the `QueueItem` content type. Anchors: `server/vueda/workflow/models.py`, `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py`.
- The authoritative workflow state/transition graph for `QueueItem` is defined by workflow migrations for the `queueitem` workflow and persisted in workflow tables; runtime availability is enforced by `TransitionSource` rules (including `ignored` sources) and checked by `fast_available_transitions()` / `fast_transition(...)`. Anchors: `server/vueda/vdq/migrations/0002_workflow_migrations_2025_09_22.py`, `server/vueda/vdq/migrations/0005_workflow_migrations_2025_11_21.py`, `server/vueda/workflow/models.py`.
- Some transition sources are intentionally marked as ignored (no-op) to tolerate late/out-of-band events without raising `InvalidTransitionError`; this is used in VDQ’s workflow history to allow late provider reconciliation after cancellation. Anchors: `server/vueda/vdq/migrations/0005_workflow_migrations_2025_11_21.py`, `server/vueda/workflow/models.py`, `server/vueda/vdq/handlers.py`.
- Celery publish is transaction-coupled: `schedule_queue_item(...)` uses `delay_on_commit(...)` and, if task enqueue fails, the queue item records the failure (including an error string in `result`) and transitions into a failure state. Anchors: `server/vueda/vdq/schedulers.py`.
- Worker execution is row-locked: `send_message(...)` uses `lock_queue_item(...)` (`SELECT ... FOR UPDATE SKIP LOCKED`) and ignores processing when the row can’t be locked. Anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/utils.py`.
- Provider dispatch and reconciliation (email and SMS) follows a common pattern:
  - A send attempt transitions the item into an “awaiting confirmation” phase; provider identifiers and provider status text are recorded on the `QueueItem` for observability. Anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`.
  - Delivery outcomes are reconciled asynchronously (signals, webhooks, and/or polling) and update workflow state to reflect success, failure, timeout, or abandonment. Anchors: `server/vueda/vdq/handlers.py`, `server/vueda/vdq/views.py`, `server/vueda/vdq/tasks.py`, `server/tests/unit/vdq/test_handlers.py`.
  - Callbacks may arrive after cancellation or retry boundaries; such late events are tolerated via ignored/no-op transition sources rather than raising transition errors. Anchors: `server/vueda/vdq/migrations/0005_workflow_migrations_2025_11_21.py`, `server/vueda/workflow/models.py`.
- Done-state semantics:
  - “Active queue” list endpoints exclude items whose workflow state code is in `QUEUE_ITEM_DONE_STATES`; “sent history” is the `SentItem` proxy over the same table filtered to done states. Anchors: `server/vueda/vdq/constants.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/models.py`.
  - Attachment file deletion is gated on all referencing queue items being in a done state. Anchors: `server/vueda/vdq/models.py`, `server/tests/unit/vdq/test_models.py`.
  - Automatic attachment cleanup on entering a done state is configuration-gated and respects `dry_run`. Anchors: `server/vueda/vdq/models.py`, `server/tests/unit/vdq/test_models.py`.
- Resend semantics:
  - Resend clones a done `SentItem` into a new `QueueItem` in the workflow initial state and schedules it; clones include method-specific detail rows/relationships when present. Anchors: `server/vueda/vdq/models.py`, `server/vueda/vdq/viewsets.py`, `server/tests/unit/vdq/test_models.py`, `server/vueda/workflow/models.py`.
- Attachment URL contract:
  - Attachment URLs are derived from `settings.VDQ_URL` and served by `PrivateAttachmentView` requiring authentication. Anchors: `server/vueda/vdq/serializers.py`, `server/vueda/vdq/views.py`, `server/README.md`.

## Footguns

- Enqueue failure is persisted: broker connectivity/operational failures in `schedule_queue_item(...)` can leave a queue item in a failure state with an exception string in `result`, without any Celery task ever running. Anchors: `server/vueda/vdq/schedulers.py`.
- `lock_queue_item(...)` uses `skip_locked=True`, so concurrent workers/callbacks can observe “no row” and silently skip work; some follow-on hooks still attempt updates and can miss writing fields like `task_id`/`retry_delay`. Anchors: `server/vueda/vdq/utils.py`, `server/vueda/vdq/tasks.py`.
- `done_since` is used as the SMS timeout age basis but is not updated by VDQ transitions (symptom: timeout age is anchored to row creation unless another code path updates it). Anchors: `server/vueda/vdq/models.py`, `server/vueda/vdq/handlers.py`.
- `PrivateAttachmentView` enforces authentication but does not perform object-level permission checks against the associated queue item (symptom: any authenticated caller can fetch an attachment by ID if they can guess/obtain it). Anchors: `server/vueda/vdq/views.py`.
- File cleanup behavior is “immediate-or-nothing” in VDQ: automatic deletion on reaching done states only occurs under a zero-age cleanup configuration; non-zero values are not acted on by this package. Anchors: `server/vueda/vdq/models.py`.

## Suggested Outline

- `## Boundary and Authority`
- `## Persistence and Workflow Boundary`
- `## Workflow-backed Lifecycle (Including Ignored Transitions)`
- `## Transaction Boundaries and Concurrency`
- `## Provider Dispatch and Asynchronous Reconciliation`
- `## Done-state Semantics and Cleanup Gating`
- `## Observability Surfaces and Failure Modes`
