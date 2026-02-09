---
title: Send SMS from VDQ with Twilio
type: how-to
audience: implementor
status: briefing
---

# Send SMS from VDQ with Twilio

## Intent and Scope

- Implement SMS delivery through VDQ queue items using Twilio as the provider.
- Scope includes enqueue (`add_sms`), worker dispatch (`send_message` -> `TwilioQueueItemHandler.send_sms`), and status updates (webhook or polling/timeout paths).
- This is a technical briefing for scoping/contracts, not final tutorial prose.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/views.py`, `server/vueda/vdq/celery.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_handlers.py`, `server/tests/unit/vdq/test_views.py`.

## Non-goals

- Not a Twilio account/dashboard onboarding guide.
- Not a full VDQ permissions/workflow design guide beyond SMS-relevant transitions and operational behavior.
- Not a guarantee that generated REST/API pages are behavior-complete without checking source/tests.

## Key Tasks

### 1. Configure Twilio mode and webhook strategy

- Set `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`.
- Choose one status path:
- With `TWILIO_WEBHOOK_URL`: webhook handles status updates and periodic task checks timeout-only.
- Without `TWILIO_WEBHOOK_URL`: periodic task polls Twilio status for awaiting messages.
- Source anchors: `server/vueda/vdq/celery.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_tasks.py`.

### 2. Enqueue SMS queue items through scheduler entrypoint

- Use `add_sms(sender, receiver, body)` to create one `QueueItem(method="sms")` + one `SMSQueueItem`.
- Sender and receiver must both have a `cell` value (`validate_sms_role`).
- `add_sms` schedules async processing immediately via `schedule_queue_item`.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_handlers.py`.

### 3. Send via worker and persist Twilio identifiers/status

- `send_message` locks queue item, transitions to `sending`, then dispatches SMS path for `method == "sms"`.
- `send_sms` calls `twilio_client.messages.create(...)` with E.164 sender/receiver and optional `status_callback`.
- On successful Twilio create call, handler stores `sms.message_sid`, writes status/result text, and transitions to `awaiting`.
- `TwilioRestException` during send transitions queue item to `errored` and stores provider error text.
- Source anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_handlers.py`.

### 4. Process delivery outcomes from webhook or polling

- Webhook endpoint validates Twilio signature and returns `403` on invalid signature.
- Webhook with known `MessageSid` updates the existing queue item via `update_sms_qi(..., webhook=True)`.
- If `MessageSid` is unknown, webhook enqueues deferred lookup task (`check_previously_received_message_sid`).
- `check_sms_status` polls using the oldest queued awaiting SMS timestamp.
- `update_sms_qi` behavior:
- `delivered` -> clear result + transition `succeed`.
- `undelivered`/`failed` -> persist error context + transition `error`.
- timeout window exceeded -> transition `timeout`.
- Source anchors: `server/vueda/vdq/views.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_views.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_handlers.py`.

### 5. Verify retry/failure bookkeeping in task layer

- QueueProcessor `on_retry` records `task_id` and optional retry delay, then transitions to `delayed`.
- QueueProcessor `on_failure` appends traceback text to `result`, clears `retry_delay`, and transitions to `errored` if needed.
- Source anchors: `server/vueda/vdq/tasks.py`, `server/tests/unit/vdq/test_tasks.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:module:vueda.vdq}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- REST:
- `{@api rest:endpoint:GET:/vueda.vdq/queueitem/}`
- `{@api rest:endpoint:GET:/vueda.vdq/sentitem/}`
- `{@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`
- `{@api rest:schema:DefaultQueueItem}`
- `{@api rest:schema:DefaultSentItem}`

## Contracts and Invariants

- `schedule_queue_item` treats broker enqueue failures as stateful queue-item failures (`errored` + persisted result text), not silent drops.
- SMS send writes Twilio SID to `SMSQueueItem.message_sid`; later webhook/polling correlation is SID-based.
- Twilio webhook is `AllowAny` plus signature validation; invalid signatures are rejected with `403`.
- Unknown webhook SID is not dropped immediately; deferred task retries lookup until timeout window.
- Polling/query surfaces operate on awaiting SMS items with non-null SID; timeout path uses `done_since` and `VDQ_TWILIO_SMS_TIMEOUT_HOURS`.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/views.py`, `server/vueda/vdq/tasks.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_handlers.py`, `server/tests/unit/vdq/test_views.py`, `server/tests/unit/vdq/test_tasks.py`.

## Footguns

- `TwilioQueueItemHandler.send_sms` catches `TwilioRestException` only; other failures (for example missing/uninitialized `twilio_client`) fall through to task failure handling, which appends traceback text via `QueueProcessor.on_failure`.
- Webhook acceptance is entirely signature-based at this endpoint (`AllowAny`); auth misconfiguration around Twilio token/signature handling can block all updates or accept only what validator allows.
- No unit test currently asserts the periodic `check_sms_timeout_only` scheduling branch when `TWILIO_WEBHOOK_URL` is set.
- Timeout behavior depends on `done_since`; unexpected `done_since` drift can move items into timeout handling sooner/later than expected.
- Source anchors: `server/vueda/vdq/handlers.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/views.py`, `server/vueda/vdq/celery.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_handlers.py`, `server/tests/unit/vdq/test_views.py`.

## Suggested Outline

```md
## Goal and Preconditions
## Twilio Configuration Mode (Webhook vs Polling)
## Queue Item Creation (`add_sms`)
## Worker Send Path (`send_message` / `send_sms`)
## Status Updates (Webhook, Polling, Timeout)
## Retry and Failure Bookkeeping
## Verification Checklist
## Known Gaps
```
