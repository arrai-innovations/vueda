---
title: Send Email from VDQ with Anymail
type: how-to
audience: implementor
status: draft
---

# Send Email from VDQ with Anymail

This guide covers implementing queued outbound email through VDQ using Anymail as the provider; including queue item creation, attachment handling, async dispatch, tracking event reconciliation, and the resend path. It focuses on email-specific behaviour; for shared VDQ patterns (scheduling, retry/cancel, status endpoints), see [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions). The queue orchestration and transition handling are built on {@api py:module:vueda.vdq} and {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}, which together implement the {@term VDQ (VUEDA Dispatch Queue)} execution model.

The guide assumes familiarity with VDQ's persistence and lifecycle model. If you have not read [VDQ and Background Work Model](../core-concepts/vdq-and-background-work), start there.

## Goal and Preconditions

The objective is a queue-backed email flow where:

- Email messages are enqueued with validated sender/receiver roles and optional attachments.
- Each recipient receives an independent {@term Queue Item (VDQ)}, enabling per-recipient status tracking.
- Async dispatch sends through Anymail and transitions queue items through the workflow lifecycle.
- Tracking events (delivery confirmation, bounces) update queue item state asynchronously.
- Transient provider failures are retried automatically with backoff.
- Operators can inspect status and resend completed items.

Before you begin:

Anymail must be configured with a valid provider backend (Mailgun, SendGrid, etc.), and the provider's API credentials must be set. DNS (SPF/DKIM) configuration is provider-specific and outside VDQ's scope.

The `vueda.vdq` URL configuration must include Anymail's tracking URLs so that webhook-based tracking events are received. Ensure `vueda.vdq` URLs are included in your project's URL configuration.

Celery must be configured and running.

## Queue Item Creation API

Use `add_email(...)` to create and immediately schedule email queue items:

```python
from vueda.vdq.schedulers import add_email

add_email(
    sender={"name": "Support", "email": "support@example.com"},
    to=[{"name": "Customer", "email": "customer@example.com"}],
    subject="Your order has shipped",
    body="Plain text body",
    html_body="<p>HTML body</p>",
    cc=[],
    bcc=[],
    reply_to=[],
    attachments=None,
)
```

Key behaviours:

- **One {@term Queue Item (VDQ)} per recipient.** VDQ creates a separate queue item for each address across `to`, `cc`, and `bcc`. Each item tracks delivery status independently.
- **Role validation.** `validate_email_role` checks that sender and receiver roles have email values before queueing. Invalid roles are rejected before any queue items are created.
- **Immediate scheduling.** `add_email` calls `schedule_queue_item` for each created queue item, which publishes a Celery task via `delay_on_commit`.

Use `add_abstract_email(...)` when you need to create the queue item without immediate scheduling; for example, when the email needs additional setup in the same transaction before dispatch.

## Attachment Handling

Attachments can be passed as mapping payloads or as prebuilt `AnyMailQueueItemAttachment` instances.

**Mapping format:**

```python
attachments = {
    "invoice.pdf": {
        "mimetype": "application/pdf",
        "file": file_content,  # bytes or file-like object
    }
}
```

**Inline attachments** use `content_disposition_is_inline` and `content_id_string` for embedding in HTML email bodies (e.g., inline images referenced by `cid:`).

The attachment model populates metadata (`file_size` and detected mimetype) on save when possible. Attachment files are stored using Django's file storage backend.

Attachment cleanup is email-specific and runs when a queue item enters a done state, subject to two conditions: `VDQ_MAX_FILES_AGE_IN_SECONDS` must be `0` (immediate cleanup), and the transition must not be a dry run. Additionally, a shared attachment (linked to multiple queue items) is only deleted when all linked queue items have reached a done state. Non-zero age values are not acted on by VDQ.

## Worker Dispatch and Error Paths

When the Celery worker processes an email queue item:

1. The worker acquires a row lock and transitions to `sending`.
2. `send_email(...)` constructs an `EmailMultiAlternatives` message with the queue item's content, attachments, and HTML alternatives.
3. The message is sent through Anymail.
4. On success: the handler stores `anymail_status.message_id` on the `AnyMailQueueItem` detail row (for later tracking correlation) and transitions to `awaiting`.
5. On failure: the handler records the error in `result` and transitions to `errored`.

**Transient failure handling.** `send_email` maps Anymail API 5xx responses and specific 4xx codes (408, 423, 429) to `AnymailTransientError`. The Celery task auto-retries transient errors with configurable backoff. On retry, `QueueProcessor.on_retry` records `task_id` and optional `retry_delay` on the queue item and transitions it to `delayed`.

**Non-transient failures** (authentication errors, malformed payloads, permanent provider rejections) propagate to the task failure handler, which appends traceback text to `result`, clears `retry_delay`, and transitions to `errored`.

## Tracking Events and Final States

Anymail tracking events drive the final state transition for email queue items. The VDQ handler `handle_bounce` processes tracking signals keyed by Anymail `message_id`:

- **`delivered`**: clears `result` and transitions to `succeeded`.
- **`bounced`, `rejected`, `failed`**: records provider error context in `result` and transitions to `errored`.

Unknown `message_id` values (events for messages not tracked by VDQ) are logged and ignored.

For tracking events to work, the VDQ URL configuration must include Anymail's webhook/tracking URLs. Verify that the provider is configured to send tracking events to the correct endpoint.

Tracking events may arrive after the queue item has moved to a terminal state (e.g., cancelled or already errored). These late events are handled via ignored transition sources; accepted without error, without state change.

## Resend and Retry Operations

**Retry** is a workflow transition on the active queue item. Non-dry-run retry cancels the prior Celery task, clears tracking metadata, and re-schedules. See [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions) for the shared retry contract.

**Resend** operates on completed items in the {@term Sent Item (VDQ)} history. `SentItem.clone()` duplicates the queue item, including `AnyMailQueueItem` detail and attachment relationships into a new `QueueItem` in the initial workflow state. The clone is scheduled independently. Resend requires `vueda_vdq.can_resend` permission.

## Verification Checklist

After implementing email through VDQ, verify:

- `add_email` creates one queue item per recipient across `to`, `cc`, and `bcc`.
- Role validation rejects senders/receivers without email values.
- Attachments are persisted with correct metadata and are accessible through the attachment endpoint.
- Worker dispatch sends through Anymail and records `message_id` on the detail row.
- Transient provider failures trigger Celery retry with the queue item in `delayed` state.
- Non-transient failures produce `errored` state with descriptive `result` text.
- Tracking events (delivered, bounced) update the queue item to the correct terminal state.
- Late tracking events after cancellation do not raise errors.
- Send queue list excludes done-state items; sent history includes them.
- Resend clones a sent item with AnyMail detail and schedules a new queue item.
- Attachment cleanup runs on done-state transition when `VDQ_MAX_FILES_AGE_IN_SECONDS == 0`.

## Known Limitations

**`send_email` sends to `qi.receiver.email` only.** The current implementation sends to the individual recipient stored on the queue item. `cc`, `bcc`, and `reply_to` relations stored by `add_abstract_email` are not passed into `EmailMultiAlternatives` headers. The multi-recipient semantics are queue-per-recipient, not one message with populated CC/BCC headers.

**Attachment download lacks object-level permission checks.** `PrivateAttachmentView` requires authentication but does not check whether the requesting user has permission on the associated queue item. Any authenticated user can fetch an attachment by ID.

**Custom viewset inheritance pitfall.** Custom queue/sent viewset overrides that combine `VuedaViewSet` with `ReadOnlyModelViewSet` can reintroduce write actions. VUEDA core emits a runtime warning for this pattern. Use `VuedaReadOnlyViewSet` instead.

**Dry-run transitions do not trigger cleanup.** Workflow dry-run transition responses report the target state, but the database state remains unchanged. Attachment cleanup does not run on dry-run transitions.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.vdq}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
- REST:
    - {@api rest:endpoint:GET:/vueda.vdq/queueitem/}
    - {@api rest:endpoint:GET:/vueda.vdq/sentitem/}
    - {@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/}
    - {@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}
    - {@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/}
    - {@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}
    - {@api rest:schema:DefaultQueueItem}
    - {@api rest:schema:DefaultSentItem}
