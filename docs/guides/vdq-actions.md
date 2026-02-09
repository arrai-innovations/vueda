---
title: Run Actions in the VUEDA Dispatch Queue (VDQ)
type: how-to
audience: implementor
status: briefing
---

# Run Actions in the VUEDA Dispatch Queue (VDQ)

## Intent and Scope

- Implement queue-backed execution for work that should not block request-response paths.
- Cover the concrete path from queue-item creation to async processing, operator retry/cancel/resend, and status visibility.
- Keep this as a technical briefing (contracts + touchpoints), not final tutorial prose.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/viewsets.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_viewsets.py`.

## Non-goals

- Not a provider-specific deep dive for AnyMail/Twilio payload design.
- Not a full workflow-permission architecture guide.
- Not a guarantee that generated API pages are behavior-complete; code/tests are authoritative.

## Key Tasks

### 1. Create queue items with validated sender/receiver payloads

- Use `add_email(...)` / `add_sms(...)` (or `add_abstract_email(...)` when enqueueing later) to create `QueueItem` records plus method-specific detail models.
- Expect role validation (`email` for email roles, `cell` for SMS roles) before queueing.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_handlers.py`.

### 2. Schedule async processing and handle enqueue failures

- Use `schedule_queue_item(...)` to call `send_message.delay_on_commit(...)`.
- If broker enqueue fails, queue item transitions to `errored` and stores a failure message in `result`.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/tests/unit/vdq/test_schedulers.py`.

### 3. Map worker execution and state transitions

- `send_message` locks the row, transitions to `sending`, and dispatches by method (`email` or `sms`).
- Email send transitions to `awaiting` on Anymail `sent/queued`; otherwise records result and transitions to `errored`.
- SMS send records provider status/message SID and transitions to `awaiting`; Twilio failures transition to `errored`.
- Source anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_handlers.py`.

### 4. Wire retry/cancel/resend operations

- Retry/cancel run through workflow execute-transition on `QueueItem`; non-dry-run retry clears prior result/task metadata and re-schedules.
- Sent-item resend clones completed items and schedules a new queue item.
- Source anchors: `server/vueda/vdq/models.py`, `server/vueda/vdq/viewsets.py`, `server/tests/unit/vdq/test_models.py`, `server/tests/unit/vdq/test_viewsets.py`.

### 5. Expose operational status and callbacks

- Use queue and sent-item list/detail endpoints for operator-facing status.
- Use Twilio webhook to update SMS queue items by message SID; use attachment endpoint for authenticated attachment retrieval.
- Source anchors: `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/views.py`, `server/tests/unit/vdq/test_viewsets.py`, `server/tests/unit/vdq/test_views.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:module:vueda.vdq}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- REST:
- `{@api rest:endpoint:GET:/vueda.vdq/queueitem/}`
- `{@api rest:endpoint:GET:/vueda.vdq/sentitem/}`
- `{@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/}`
- `{@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}`
- `{@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}`
- `{@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`
- `{@api rest:schema:DefaultQueueItem}`
- `{@api rest:schema:DefaultSentItem}`

## Contracts and Invariants

- Queue-item done states are currently treated as `cancelled`, `succeeded`, and `unconfirmed`; send-queue list excludes these states, while detail fetch still allows them.
- Default VDQ queue/sent viewsets now inherit `VuedaReadOnlyViewSet`, so baseline surface is read-only for queue/sent resources, with explicit extra actions (for example resend) added by decorator.
- `QueueProcessor.on_retry` records `task_id` and retry delay (when available) and transitions queue item to `delayed`.
- Retry transition behavior (non-dry-run): cancels prior Celery task if present, clears `task_id`/`retry_delay`/`result`, then re-schedules.
- `SentItem.clone()` carries sender/receiver/method and duplicates available AnyMail/SMS detail into a fresh `queued` item.
- Attachment cleanup is email-only and deletes a shared attachment only after all linked queue items are done; cleanup on transition is gated by `VDQ_MAX_FILES_AGE_IN_SECONDS == 0` and skipped in dry-run.
- Twilio webhook enforces signature validation, updates existing queue items when SID is found, and enqueues deferred lookup when missing.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/vdq/constants.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/models.py`, `server/vueda/vdq/views.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/vdq/test_viewsets.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_models.py`, `server/tests/unit/vdq/test_views.py`.

## Footguns

- `QueueItem` defines `can_cancel`/`can_retry` permissions, but only resend-specific permission checks are explicit in VDQ viewset permission code; cancel/retry checks are workflow-path dependent and not documented as codename-enforced in VDQ tests.
- `QueueItem.allow_transition(...)` contains a condition using `self.workflow.code == "delayed"`; `delayed` is a state code, so this guard may not apply as intended.
- Combining `VuedaViewSet` with `ReadOnlyModelViewSet` on custom queue/sent overrides can accidentally re-introduce writable action methods and schema noise; core now emits a runtime warning to catch this pattern.
- Retry/cancel safety assumes your queued operation is idempotent; VDQ does not enforce idempotency at the framework layer.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/vdq/models.py`, `server/vueda/vdq/permissions.py`, `server/vueda/vdq/viewsets.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/vdq/test_permissions.py`.

## Suggested Outline

```md
## Goal and Preconditions
## Queue Item Creation
## Scheduling and Worker Dispatch
## Retry and Cancel Flow
## Sent Item Resend Flow
## Status Surfaces and Callbacks
## Verification Checklist
## Known Gaps
```
