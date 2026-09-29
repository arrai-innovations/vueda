---
title: Send SMS from VDQ with Twilio
type: how-to
audience: integrator
status: draft
---

# Send SMS from VDQ with Twilio

This guide sets up Twilio as the SMS provider for the {@term VDQ (VUEDA Dispatch Queue)}: credentials, delivery status by webhook or by polling, and the Celery beat schedule that checks status. It then sends a test message and shows how each Twilio status changes the {@term Queue Item}.

[Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions) describes installing and routing VDQ, creating senders and receivers, running the worker, and retrying, cancelling, or resending items. This guide assumes that setup. [VDQ and Background Work Model](../core-concepts/vdq-and-background-work) describes the queue item lifecycle and its known gaps.

## Configure Twilio Credentials

{@api py:function:vueda.core.default_settings.get_defaults} reads three Twilio keys from your project's `config.toml` (or `config.local.toml`):

```toml
TWILIO_ACCOUNT_SID = "AC..."
TWILIO_AUTH_TOKEN = "..."
TWILIO_CALLER_ID = "+18005550100"
```

- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` create the Twilio client in {@api py:class:vueda.vdq.handlers.TwilioQueueItemHandler}. The auth token also checks the signature on status callbacks.
- `TWILIO_CALLER_ID` is the Twilio number that VUEDA's own user messages send from. VUEDA offers SMS for welcome, forgot password, and TOTP code messages only when [`is_twilio_configured`]{@api py:function:vueda.user.utils.is_twilio_configured} finds all three keys set. With VDQ installed, [`DefaultUserAdapter.send_sms`]{@api py:function:vueda.user.adapters.DefaultUserAdapter.send_sms} queues those messages through VDQ.

Without `TWILIO_ACCOUNT_SID`, the handler has no client. The worker then fails each SMS item and moves it to `errored` with a traceback in `result`.

## Choose How Delivery Status Arrives

Twilio reports delivery status after it accepts a message. The `TWILIO_WEBHOOK_URL` setting selects how VDQ receives that status.

| Mode    | `TWILIO_WEBHOOK_URL` | How status arrives                                            | Needs inbound access |
| ------- | -------------------- | ------------------------------------------------------------- | -------------------- |
| Webhook | Set                  | Twilio posts each status change to the callback endpoint.     | Yes                  |
| Polling | Not set              | A periodic task lists recent messages from Twilio every 30 s. | No                   |

Use polling on a development machine that Twilio cannot reach. Use the webhook in production, so each status arrives when Twilio sends it.

### Webhook mode

1. Set `TWILIO_WEBHOOK_URL` in your settings module. `get_defaults` does not read it, so read it from your config yourself:

    ```python
    TWILIO_WEBHOOK_URL = env("TWILIO_WEBHOOK_URL", default="")
    ```

2. Set the value to the public HTTPS URL of {@api rest:endpoint:POST:/vueda.vdq/twilio-status-callback/}. Use the prefix where your project includes {@api py:module:vueda.vdq.urls}. If you include them under the scaffolded `routes/` prefix, the URL is `https://app.example.com/routes/vueda.vdq/twilio-status-callback/`.

3. If a proxy terminates TLS in front of Django, set {@api ext:django:setting:SECURE_PROXY_SSL_HEADER} so Django sees the request as HTTPS. If the proxy rewrites the `Host` header, also set {@api ext:django:setting:USE_X_FORWARDED_HOST}.

    Twilio signs the full URL it posts to. {@api py:function:vueda.vdq.views.validate_twilio_request} rebuilds that URL with {@api ext:django:django.http.HttpRequest.build_absolute_uri}. It then checks the `X-Twilio-Signature` header against the rebuilt URL. A scheme or host mismatch fails every callback with `403`. A port difference does not.

When `TWILIO_WEBHOOK_URL` is set, [`send_sms`]{@api py:function:vueda.vdq.handlers.TwilioQueueItemHandler.send_sms} passes it to Twilio as `status_callback` on every message. The endpoint accepts requests without a login or a CSRF token, so the signature is its only check. Keep `TWILIO_AUTH_TOKEN` secret.

A callback can arrive before the worker stores the message SID. The endpoint then queues [`check_previously_received_message_sid`]{@api py:function:vueda.vdq.tasks.check_previously_received_message_sid}, which retries every 10 seconds. After `VDQ_TWILIO_SMS_TIMEOUT_HOURS`, the task stops and logs an error, and VDQ drops the status from that callback.

### Polling mode

Leave `TWILIO_WEBHOOK_URL` unset or empty. VDQ sends messages with no callback URL, and {@api py:function:vueda.vdq.tasks.check_sms_status} polls Twilio instead. It lists the messages sent since the day that the oldest awaiting SMS item was queued. It then updates each awaiting item whose message SID matches.

## Run Celery Beat

Both modes rely on a periodic task that Celery beat schedules. When `TWILIO_ACCOUNT_SID` is set, {@api py:function:vueda.vdq.celery.setup_periodic_tasks} registers one task on the VDQ Celery app ({@api py:module:vueda.vdq.celery}):

- Webhook mode: {@api py:function:vueda.vdq.tasks.check_sms_timeout_only} every 30 seconds.
- Polling mode: `check_sms_status` every 30 seconds.

Set `DJANGO_SETTINGS_MODULE` to your settings module, then run the worker with an embedded beat scheduler:

```console
celery -A vueda.vdq.celery:app worker -l info -B
```

The `-B` flag runs beat inside the worker. Without the flag or a separate `celery beat` process, SMS items stay `awaiting`: polling never runs, and nothing times out. The app picks the task when it starts, so restart the worker after you change `TWILIO_WEBHOOK_URL` or `TWILIO_ACCOUNT_SID`.

## Send a Test Message

Open a Django shell (`python manage.py shell`) and queue a message with [`add_sms`]{@api py:function:vueda.vdq.schedulers.add_sms}. The sender's `cell` must be a number that your Twilio account can send from.

```python
from django.conf import settings

from vueda.vdq.models import Receiver, Sender
from vueda.vdq.schedulers import add_sms

sender, _ = Sender.objects.get_or_create(name="System", cell=settings.TWILIO_CALLER_ID)
receiver, _ = Receiver.objects.get_or_create(name="Test recipient", cell="+18005550199")

[qi] = add_sms(sender=sender, receiver=receiver, body="VDQ test message")
```

`add_sms` takes {@api py:class:vueda.vdq.models.Sender} and {@api py:class:vueda.vdq.models.Receiver} rows. If either has no `cell`, it raises `ValueError` before it creates anything. Otherwise it creates one queue item and one {@api py:class:vueda.vdq.models.SMSQueueItem}, and returns the queue item in a one-item list. The `cell` fields store numbers in E.164 form, and `send_sms` sends them in that form.

After the worker runs, reload the item and read its state:

```python
qi.refresh_from_db()
qi.workflow_state.code, qi.sms.message_sid, qi.result
```

Once Twilio accepts the message, the item is `awaiting`. It has a message SID, and `result` holds Twilio's status text, such as `queued`. The next status update moves it to `succeeded` or `errored`, as the next section describes. [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions) shows how to inspect items through the API.

## Status Mapping

[`update_sms_qi`]{@api py:function:vueda.vdq.handlers.TwilioQueueItemHandler.update_sms_qi} applies each Twilio status the same way in both modes:

| Twilio status             | Queue item result                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `delivered`               | Moves to `succeeded`, and `result` is cleared.                                                   |
| `undelivered` or `failed` | Moves to `errored`. `result` holds the status, the Twilio error code and message, and doc links. |
| Any other status          | Stays `awaiting`, unless the timeout below has passed.                                           |

If Twilio rejects the send request itself (a `TwilioRestException`), the item moves to `errored` with Twilio's error message in `result`. Other worker exceptions also end in `errored`, with a traceback in `result`.

The timeout is `VDQ_TWILIO_SMS_TIMEOUT_HOURS`, 2 hours by default. It counts from the queue item's creation time, stored in {@api py:function:vueda.vdq.models.QueueItem.done_since}. An item with no final status after that moves to `unconfirmed`, a {@term Done State}. Its `result` then reads "Carrier did not confirm delivery".

- In webhook mode, `check_sms_timeout_only` fetches each timed-out item's status from Twilio once more. It applies a final status if Twilio has one, and otherwise times the item out. A failed fetch also times the item out.
- In polling mode, an item times out when a poll returns its message with a non-final status.

A retried item keeps its creation time, so its first non-final status after the retry can time it out. A resent item is a new queue item with a new timeout window.
