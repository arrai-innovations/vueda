---
title: Send Email from VDQ with Anymail
type: how-to
audience: implementor
status: briefing
---

# Send Email from VDQ with Anymail

## Intent and Scope

- Implement queued outbound email through VDQ using Anymail, including attachment handling and queue-state visibility.
- Cover the concrete flow: queue item creation (`add_email`), async dispatch (`send_message` -> `send_email`), and post-send status updates (Anymail tracking events).
- Keep this as technical scoping/contract briefing, not final tutorial prose.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/urls.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_handlers.py`, `server/tests/unit/vdq/test_tasks.py`.

## Non-goals

- Not a provider setup guide (DNS, API keys, provider dashboard configuration).
- Not a generic VDQ workflow-permissions deep dive beyond email-specific retry/resend touchpoints.
- Not a guarantee that generated REST pages are behavior-complete; verify runtime contracts in source/tests.

## Key Tasks

### 1. Create queue items via scheduler entrypoints

- Use `add_email(...)` for immediate enqueue, or `add_abstract_email(...)` when creation without immediate schedule is needed.
- Ensure sender/receiver roles have email values (`validate_email_role`).
- Expect one `QueueItem` per recipient across `to + cc + bcc`.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_handlers.py`.

### 2. Pass and persist attachment payloads safely

- Attachment input accepts either mapping payloads (`{"filename": {mimetype, file, ...}}`) or prebuilt `AnyMailQueueItemAttachment` sequence.
- Inline attachments use `content_disposition_is_inline` + `content_id_string`; regular attachments are attached as files.
- Attachment model save populates metadata such as `file_size`/detected mimetype when possible.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/models.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_models.py`, `server/tests/unit/vdq/test_handlers.py`.

### 3. Schedule async send and handle broker errors

- `schedule_queue_item(...)` uses `send_message.delay_on_commit(...)`.
- Broker/enqueue errors transition queue items to `errored` and write failure text in `result`.
- Source anchors: `server/vueda/vdq/schedulers.py`, `server/tests/unit/vdq/test_schedulers.py`.

### 4. Send through Anymail and map result to workflow state

- Worker task transitions queue item to `sending`, then dispatches email path when `method == "email"`.
- `send_email(...)` sends with `EmailMultiAlternatives`, stores `anymail_status.message_id`, and transitions:
- `awaiting` when Anymail status includes `sent` or `queued`.
- `errored` otherwise, with `result` populated.
- Source anchors: `server/vueda/vdq/tasks.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_tasks.py`, `server/tests/unit/vdq/test_handlers.py`.

### 5. Handle transient provider failures and retries

- `send_email(...)` maps Anymail API 5xx and {408, 423, 429} to `AnymailTransientError`.
- Queue processor task autoretries `AnymailTransientError` with configured backoff/retry metadata handling.
- On retry bookkeeping, task stores `task_id` and optional `retry_delay`, and transitions queue item to `delayed`.
- Source anchors: `server/vueda/vdq/handlers.py`, `server/vueda/vdq/tasks.py`, `server/tests/unit/vdq/test_handlers.py`, `server/tests/unit/vdq/test_tasks.py`.

### 6. Process tracking/bounce events for final state

- Ensure `vueda.vdq` URLs include `anymail.urls` and tracking signal handler is active.
- Tracking events keyed by Anymail `message_id` drive state updates (`delivered` -> `succeeded`, `bounced/rejected/failed` -> `errored`).
- Unknown `message_id` events are logged and ignored.
- Source anchors: `server/vueda/vdq/urls.py`, `server/vueda/vdq/handlers.py`, `server/tests/unit/vdq/test_handlers.py`.

### 7. Verify operator-facing retrieval and resend path

- Use queue/sent endpoints to inspect status; send-queue list excludes done states while detail still resolves done items.
- Resend clones a sent item and schedules a new queue item (requires `vueda_vdq.can_resend`).
- Source anchors: `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/models.py`, `server/vueda/vdq/permissions.py`, `server/tests/unit/vdq/test_viewsets.py`, `server/tests/unit/vdq/test_permissions.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:module:vueda.vdq}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}`
- REST:
- `{@api rest:endpoint:GET:/vueda.vdq/queueitem/}`
- `{@api rest:endpoint:GET:/vueda.vdq/sentitem/}`
- `{@api rest:endpoint:POST:/vueda.vdq/sentitem/resend/}`
- `{@api rest:endpoint:POST:/vueda.vdq/sentitem/{id}/resend/}`
- `{@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/}`
- `{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}`
- `{@api rest:schema:DefaultQueueItem}`
- `{@api rest:schema:DefaultSentItem}`

## Contracts and Invariants

- Queue item creation for email is recipient-oriented: one `QueueItem(method="email")` per receiver in `to`, `cc`, and `bcc` inputs.
- Default VDQ queue/sent viewsets inherit `VuedaReadOnlyViewSet`; queue/sent baseline endpoints are read-only, with resend exposed as an explicit extra action.
- Scheduling failure at broker handoff is persisted as `errored` + `result` message; failures are not silently dropped.
- `send_email(...)` persists provider `message_id` on `AnyMailQueueItem` before bounce/tracking correlation.
- Transient AnyMail API failures are explicitly retriable; non-transient errors propagate and are handled by task failure logic.
- Send queue list excludes done states (`cancelled`, `succeeded`, `unconfirmed`), but detail endpoint can still fetch done items by PK.
- Attachment file cleanup happens only for done-state email items and only when `VDQ_MAX_FILES_AGE_IN_SECONDS == 0` (and not on dry-run transitions).
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/tasks.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/constants.py`, `server/vueda/vdq/models.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_handlers.py`, `server/tests/unit/vdq/test_viewsets.py`, `server/tests/unit/vdq/test_models.py`.

## Footguns

- `add_abstract_email(...)` stores `to`/`cc`/`reply_to` relations, but `send_email(...)` currently sends using only `qi.receiver.email` and does not pass `cc`/`bcc`/`reply_to` into `EmailMultiAlternatives`; treat multi-recipient semantics as queue-per-recipient, not one message with populated CC/BCC headers.
- Custom queue/sent viewset overrides that combine `VuedaViewSet` with `ReadOnlyModelViewSet` can reintroduce write actions in the class surface; core now warns on that inheritance pattern.
- Attachment download endpoint requires authentication, but current view code does not apply per-object ownership checks.
- Workflow dry-run transition responses can report target states while DB state remains unchanged; avoid treating dry-run response as persisted state.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/vdq/schedulers.py`, `server/vueda/vdq/handlers.py`, `server/vueda/vdq/viewsets.py`, `server/vueda/vdq/views.py`, `server/tests/unit/core/test_viewsets.py`, `server/tests/unit/vdq/test_schedulers.py`, `server/tests/unit/vdq/test_viewsets.py`, `server/tests/unit/vdq/test_views.py`.

## Suggested Outline

```md
## Goal and Preconditions
## Queue Item Creation API
## Attachment Handling
## Worker Dispatch and Error Paths
## Tracking Events and Final States
## Resend and Retry Operations
## Verification Checklist
## Known Limitations
```
