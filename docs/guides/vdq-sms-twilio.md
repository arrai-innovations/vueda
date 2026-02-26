---
title: Send SMS from VDQ with Twilio
type: how-to
audience: implementor
status: draft
---

# Send SMS from VDQ with Twilio

This guide covers implementing SMS delivery via VDQ using Twilio as the provider, including selecting configuration mode (webhook vs polling), creating queue items, dispatching workers, and reconciling delivery status. It focuses on SMS-specific behaviour; for shared VDQ patterns (scheduling, retry/cancel, status endpoints), see [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions). The queue and transition behavior here is implemented through `{@api py:module:vueda.vdq}` and `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`, and follows the `{@term VDQ (VUEDA Dispatch Queue)}` lifecycle.

The guide assumes familiarity with VDQ's persistence and lifecycle model. If you have not read [VDQ and Background Work Model](../core-concepts/vdq-and-background-work), start there.

## Goal and Preconditions

The objective is a queue-backed SMS flow where:

- SMS messages are enqueued with validated sender/receiver cell numbers.
- Async dispatch sends through Twilio and tracks delivery status.
- Delivery outcomes are reconciled via webhook callbacks or periodic polling.
- Timeout handling catches messages that never receive a delivery confirmation.

Before you begin:

Twilio credentials must be configured: `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`. These are used both for sending and for webhook signature validation.

Celery must be configured and running. The VDQ periodic task schedule must be active for polling/timeout behaviour.

## Twilio Configuration Mode (Webhook vs Polling)

VDQ supports two modes for receiving SMS delivery status updates. Choose one based on your deployment:

**Webhook mode** (`TWILIO_WEBHOOK_URL` is set): Twilio sends status updates to the configured callback URL. VDQ's webhook endpoint validates the Twilio signature and updates the queue item. The periodic task only checks for timeouts; it does not poll Twilio for status.

**Polling mode** (`TWILIO_WEBHOOK_URL` is not set): The periodic task `check_sms_status` polls Twilio for the status of awaiting SMS messages. This mode does not require inbound webhook access but adds latency to status updates (they arrive on the polling interval rather than in real time).

In both modes, the `send_sms` handler passes `status_callback` to `twilio_client.messages.create(...)` when a webhook URL is configured, enabling Twilio to push updates proactively.

## Queue Item Creation (`add_sms`)

Use `add_sms(sender, receiver, body)` to create and immediately schedule an SMS queue item:

```python
from vueda.vdq.schedulers import add_sms

add_sms(
    sender={"name": "System", "cell": "+15551234567"},
    receiver={"name": "Customer", "cell": "+15559876543"},
    body="Your verification code is 123456",
)
```

Key behaviours:

- **One {@term Queue Item (VDQ)} per call.** Unlike email (which creates one item per recipient), SMS creates a single `QueueItem(method="sms")` plus one `SMSQueueItem` detail row per `add_sms` call.
- **Role validation.** `validate_sms_role` checks that both sender and receiver have a `cell` value. Invalid roles are rejected before the queue item is created.
- **Immediate scheduling.** `add_sms` calls `schedule_queue_item`, which publishes a Celery task via `delay_on_commit`.

Phone numbers should be in E.164 format (`+1XXXXXXXXXX`). The numbers are passed directly to `twilio_client.messages.create(...)`.

## Worker Send Path (`send_message` / `send_sms`)

When the Celery worker processes an SMS queue item:

1. The worker acquires a row lock and transitions to `sending`.
2. `send_sms` calls `twilio_client.messages.create(...)` with the sender's and receiver's cell numbers, the message body, and optionally the `status_callback` URL.
3. On success: the handler stores `message_sid` on the `SMSQueueItem` detail row, records provider status text and result, and transitions to `awaiting`.
4. On `TwilioRestException`: the handler records the provider error text in `result` and transitions to `errored`.

Other failures (e.g., missing or uninitialized `twilio_client`) fall through to the Celery task failure handler (`QueueProcessor.on_failure`), which appends traceback text to `result` and transitions the item to `errored`.

## Status Updates (Webhook, Polling, Timeout)

### Webhook

The Twilio webhook endpoint (`/vueda.vdq/twilio-status-callback/`) is `AllowAny` for authentication (Twilio cannot send bearer tokens), but validates the Twilio request signature. Invalid signatures are rejected with `403`.

When the webhook receives a status update with a known `MessageSid`:

- `update_sms_qi` processes the status.
- **`delivered`**: clears `result` and transitions to `succeeded`.
- **`undelivered` or `failed`**: records error context and transitions to `errored`.

When the `MessageSid` is unknown (the queue item has not yet been committed, or a race condition occurred), the webhook enqueues a deferred lookup task (`check_previously_received_message_sid`) that retries the update until the item is found or the retry window expires.

### Polling

The periodic task `check_sms_status` fetches Twilio status for awaiting SMS messages. It queries based on the oldest queued awaiting SMS timestamp and updates queue items via `update_sms_qi` with the same status-to-transition mapping as the webhook path.

### Timeout

Both webhook and polling modes check for timeout. `update_sms_qi` evaluates whether the timeout window (`VDQ_TWILIO_SMS_TIMEOUT_HOURS`) has been exceeded based on the queue item's `done_since` field. Items past the timeout window transition to `unconfirmed` (a done state).

Note that `done_since` is not automatically updated by VDQ workflow transitions. The timeout age is anchored to the value set at row creation or by explicit code paths. Unexpected drift in `done_since` can cause items to enter timeout handling sooner or later than expected.

## Retry and Failure Bookkeeping

`QueueProcessor.on_retry` records `task_id` and optional `retry_delay` on the queue item and transitions it to `delayed`. This applies to Celery-driven retries (e.g., transient network errors).

`QueueProcessor.on_failure` appends traceback text to `result`, clears `retry_delay`, and transitions to `errored` if the item is not already in an error state.

Operator-initiated retry (via the workflow execute-transition endpoint) cancels the prior Celery task, clears the tracking metadata, and reschedules. See [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions) for the shared retry contract.

## Verification Checklist

After implementing SMS through VDQ, verify:

- `add_sms` creates a queue item with valid sender/receiver cell numbers.
- Role validation rejects senders/receivers without cell values.
- Worker dispatch sends through Twilio and records `message_sid` on the detail row.
- Twilio API failures produce `errored` state with provider error text.
- Webhook receives status updates and transitions to the correct terminal state.
- Webhook validates Twilio signature and rejects invalid signatures with `403`.
- Unknown `MessageSid` in webhook triggers deferred lookup rather than being dropped.
- Polling mode updates awaiting items on the periodic schedule.
- Timeout transitions awaiting items to `unconfirmed` after the configured window.
- Retry clears prior task metadata and re-schedules successfully.

## Known Gaps

**`TwilioRestException` is the only caught provider exception.** Other failure modes (missing `twilio_client`, network-level errors) fall through to the generic task failure handler. The symptoms are the same (the queue item transitions to `errored` with a traceback in `result`), but the error path is different.

**Webhook acceptance is signature-only.** The endpoint uses `AllowAny` for Django/DRF authentication. Misconfigured Twilio tokens or signature validation can block all updates or accept unintended traffic.

**Periodic timeout-only scheduling is not unit-tested.** The `check_sms_timeout_only` scheduling branch (active when `TWILIO_WEBHOOK_URL` is set) does not have a dedicated test. Verify the timeout behaviour in your deployment if using webhook mode.

**`done_since` drift affects timeout accuracy.** The timeout window is calculated from `done_since`, which is set at row creation. If `done_since` is not updated by the expected code paths, timeout handling may trigger at unexpected times.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.vdq}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
- REST:
    - {@api rest:endpoint:GET:/vueda.vdq/queueitem/}
    - {@api rest:endpoint:GET:/vueda.vdq/sentitem/}
    - {@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}
    - {@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}
    - {@api rest:schema:DefaultQueueItem}
    - {@api rest:schema:DefaultSentItem}
