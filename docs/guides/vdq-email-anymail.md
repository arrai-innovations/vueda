---
title: Send Email from VDQ with Anymail
type: how-to
audience: integrator
status: draft
---

# Send Email from VDQ with Anymail

This guide sets up email delivery for the {@term VDQ (VUEDA Dispatch Queue)} through Anymail. It covers the backend settings, the provider's tracking webhook, attachments, and how provider events set each {@term Queue Item}'s state.

[VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md) describes the queue item lifecycle and its known gaps. [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions.md) covers installing and routing VDQ, creating senders and receivers, running the worker, and retrying, cancelling, and resending items.

## Before You Begin

- VDQ is installed, its URLs are included, and a Celery worker is running, as [Run Actions in the VUEDA Dispatch Queue (VDQ)](./vdq-actions.md) describes.
- You have an account with an email service provider (ESP) that Anymail supports, and a verified sending domain. Your provider's documentation covers the DNS records (SPF, DKIM) for that domain.

## Select the Email Backend

{@api py:function:vueda.core.default_settings.get_defaults} reads the `EMAIL_BACKEND` config key and puts it in Django's {@api ext:django:setting:EMAIL_BACKEND} setting. The key's default is Django's console backend, which prints each message instead of sending it.

For Mailgun, set these keys in `config.local.toml`, or as environment variables, which {@api py:class:vueda.core.config.TomlEnv} reads first:

```toml
EMAIL_BACKEND = "anymail.backends.mailgun.EmailBackend"
ANYMAIL_MAILGUN_API_KEY = "<Mailgun API key>"
ANYMAIL_MAILGUN_SENDER_DOMAIN = "mg.example.com"
ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY = "<Mailgun webhook signing key>"
ANYMAIL_WEBHOOK_SECRET = "<random user>:<random password>"
```

When `EMAIL_BACKEND` names the Mailgun backend, `get_defaults` requires the other four keys, and settings fail to load if one is missing. `get_defaults` also sets `ANYMAIL_MAILGUN_API_URL`, which defaults to `https://api.mailgun.net/v3`. Set that key to use another Mailgun API host.

For another ESP, set `EMAIL_BACKEND` to that ESP's Anymail backend. `get_defaults` sets no provider settings for it, so add the ESP's `ANYMAIL_*` settings and `ANYMAIL_WEBHOOK_SECRET` in your settings module, after the `get_defaults` line. VUEDA installs `django-anymail` with the `mailgun`, `sendgrid`, and `sparkpost` extras. Add the extra for any other ESP to your project's dependencies.

[Configuration Surface and Defaults](../core-concepts/configuration-surface-and-defaults.md) describes the `use_mailers` option, which puts the backend in Django 6.1's `MAILERS` setting instead.

## Connect the Tracking Webhook

The provider reports delivery results to Anymail's tracking webhook. {@api py:module:vueda.vdq.urls} mounts Anymail's URLs at `vueda.vdq/anymail/`, below the prefix where you include the VDQ URLs. With VDQ included under `routes/`, the prefix that the scaffolded project uses, the Mailgun tracking URL is:

```text
https://<user>:<password>@app.example.com/routes/vueda.vdq/anymail/mailgun/tracking/
```

For another ESP, replace `mailgun` with its Anymail name, such as `sendgrid` or `sparkpost`.

1. Put the two halves of `ANYMAIL_WEBHOOK_SECRET` in the URL as the user and password. Anymail returns `400` for a webhook request whose HTTP basic auth credentials do not match.
2. Register the URL in the provider's dashboard for delivery, bounce, and failure events.
3. For Mailgun, copy the webhook signing key from the same dashboard into `ANYMAIL_MAILGUN_WEBHOOK_SIGNING_KEY`. Anymail checks each event's signature with it.

## Send an Email

Call {@api py:function:vueda.vdq.schedulers.add_email} with a {@api py:class:vueda.vdq.models.Sender} and one or more {@api py:class:vueda.vdq.models.Receiver} rows:

```python
from vueda.vdq.schedulers import add_email

queue_items = add_email(
    sender=support,
    to=[customer],
    subject="Your order has shipped",
    text="Your order is on its way.",
    html="<p>Your order is on its way.</p>",
    reply_to=[orders_desk],
    origin=order,
)
```

`add_email` returns the queue items it created:

- It creates one queue item for each receiver in [`to`]{@api py:param:vueda.vdq.schedulers.add_email.to}, [`cc`]{@api py:param:vueda.vdq.schedulers.add_email.cc}, and [`bcc`]{@api py:param:vueda.vdq.schedulers.add_email.bcc}. Each item sends one message, addressed to its own receiver only.
- The message carries a `Reply-To` header with the email addresses of the [`reply_to`]{@api py:param:vueda.vdq.schedulers.add_email.reply_to} receivers.
- The sender, every receiver, and every `reply_to` receiver must have an email address. Otherwise `add_email` raises `ValueError`, and its transaction rolls back every row it created.
- [`origin`]{@api py:param:vueda.vdq.schedulers.add_email.origin} links each queue item to the record that caused the email. A model that subclasses {@api py:class:vueda.vdq.models.QueueItemOrigin} can reach its queue items through a generic relation.
- `add_email` publishes the send task when the surrounding transaction commits.

Receivers in `cc` and `bcc` each get their own message with no `Cc` header, so they do not see each other's addresses.

To create the queue items without sending them yet, call {@api py:function:vueda.vdq.schedulers.add_abstract_email} with the same arguments. Call {@api py:function:vueda.vdq.schedulers.schedule_queue_item} on each returned item when it is ready.

## Attach Files

Pass [`attachments`]{@api py:param:vueda.vdq.schedulers.add_email.attachments} as a mapping from file name to a mapping with these keys:

- `mimetype`: required, such as `application/pdf`.
- `file`: required, a file object opened in binary mode. `add_email` reads it during the call.
- [`content_disposition_is_inline`]{@api py:function:vueda.vdq.models.AbstractQueueItemAttachment.content_disposition_is_inline} and [`content_id_string`]{@api py:function:vueda.vdq.models.AbstractQueueItemAttachment.content_id_string}: optional. Set both to embed an image in the HTML body.

```python
with open("logo.png", "rb") as logo, open("invoice.pdf", "rb") as invoice:
    add_email(
        sender=support,
        to=[customer],
        subject="Your invoice",
        text="Your invoice is attached.",
        html='<p><img src="cid:logo"> Your invoice is attached.</p>',
        attachments={
            "logo.png": {
                "mimetype": "image/png",
                "file": logo,
                "content_disposition_is_inline": True,
                "content_id_string": "logo",
            },
            "invoice.pdf": {"mimetype": "application/pdf", "file": invoice},
        },
    )
```

{@api py:function:vueda.vdq.handlers.send_email} attaches an inline image under a content ID that Anymail generates. It rewrites each `cid:<content_id_string>` reference in the HTML to that ID.

`add_email` saves each file once, under `email_queue_item_attachments/` in the default storage ({@api ext:django:setting:STORAGES}). All queue items from the call share those attachment rows. To reuse attachments from an earlier call, pass a list of saved {@api py:class:vueda.vdq.models.AnyMailQueueItemAttachment} rows instead of a mapping.

### Serve attachment links

The queue item API lists each attachment with a download URL built from the `VDQ_URL` setting. `get_defaults` does not set it. Set it in your settings module to the path of the VDQ URLs:

```python
VDQ_URL = "/routes/vueda.vdq"
```

Links then point at the {@api rest:endpoint:GET:/vueda.vdq/attachments/{id}/} endpoint. Any signed-in user can download an attachment by its ID. [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md) describes this gap.

### Delete attachment files after sending

To delete attachment files once they are sent, set `VDQ_MAX_FILES_AGE_IN_SECONDS = 0` in your settings module. When a queue item reaches a {@term Done State}, VDQ deletes the file of each attachment whose queue items are all done. The attachment row stays. With any other value, or with the setting unset, VDQ keeps the files.

Resending an item whose attachment files were deleted fails, because the send reads each file. The new item moves to `errored`.

## Provider Errors and Retries

`send_email` sends through Anymail and updates the queue item from the result:

| Result                                                          | Queue item                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Accepted with Anymail status `sent` or `queued`                 | Stores the provider's message ID in [`message_id`]{@api py:function:vueda.vdq.models.AnyMailQueueItem.message_id} and moves to `awaiting`. |
| Accepted with any other status                                  | Records the status in [`result`]{@api py:function:vueda.vdq.models.QueueItem.result} and moves to `errored`.                               |
| Provider API error with HTTP status 5xx, `408`, `423`, or `429` | Raises {@api py:class:vueda.vdq.exceptions.AnymailTransientError}, and the task retries. The item waits in `delayed`.                      |
| Any other error                                                 | Appends the traceback to `result` and moves to `errored`.                                                                                  |

The task class {@api py:class:vueda.vdq.tasks.BaseTask} sets the retry schedule. It allows up to 12 retries ({@api ext:celery:Task.max_retries}) with exponential backoff from 16 seconds ({@api ext:celery:Task.retry_backoff}), without jitter. When the retries run out, the item moves to `errored`.

## Provider Events and Queue Item States

Anymail sends each tracking event to {@api py:function:vueda.vdq.handlers.handle_bounce}, which finds the queue item by the event's message ID:

| Event type            | Effect                                                                             |
| --------------------- | ---------------------------------------------------------------------------------- |
| `delivered`           | Clears `result` and moves the item to `succeeded`.                                 |
| `bounced`, `rejected` | Records the provider's reject reason in `result` and moves the item to `errored`.  |
| `failed`              | Records `Email Failed.` in `result` and moves the item to `errored`.               |
| `delayed`             | Writes a note to `result` that the provider will retry. The state does not change. |
| `queued`, `sent`      | No change.                                                                         |
| Any other type        | Logged at info level. No change.                                                   |

An event whose message ID matches no queue item is logged as a warning and skipped. [VDQ and Background Work Model](../core-concepts/vdq-and-background-work.md) describes what happens when an event arrives for an item that has left `awaiting`.

## Verify the Setup

1. Send a request to the tracking URL without credentials:

    ```sh
    curl -i -X POST https://app.example.com/routes/vueda.vdq/anymail/mailgun/tracking/
    ```

    The response is `400`, because the basic auth credentials are missing.

2. Send a test event from the provider's dashboard. The server log shows `Tracking event <type> for unknown message_id=<id>`, because the test event does not name a queue item.
3. Send an email with `add_email` to an address you control.
4. Sign in as a user whose groups grant `vueda_vdq.read_queueitem`, and fetch the item by its ID from the queue item endpoint ({@api rest:endpoint:GET:/vueda.vdq/queueitem/}). Its `workflow_state_code` is `awaiting` after the send, and `succeeded` after the provider reports delivery.
