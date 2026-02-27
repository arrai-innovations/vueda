"""Email and SMS send handlers and Twilio webhook processing for the VDQ."""

__all__ = (
    "TwilioQueueItemHandler",
    "handle_bounce",
    "send_email",
    "timeout_queue_item",
    "validate_email_role",
    "validate_sms_role",
)

import logging
from datetime import timedelta

from anymail.exceptions import AnymailAPIError
from anymail.message import attach_inline_image
from anymail.signals import tracking
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.db.models import DurationField
from django.db.models import ExpressionWrapper
from django.db.models import F
from django.dispatch import receiver
from django.utils import timezone

from vueda.vdq.exceptions import AnymailTransientError
from vueda.vdq.models import QueueItem
from vueda.vdq.utils import lock_queue_item


logger = logging.getLogger(__name__)


try:
    from twilio.base.exceptions import TwilioException
    from twilio.base.exceptions import TwilioRestException
    from twilio.rest import Client

    has_twilio = True
except ImportError:
    has_twilio = False


def validate_email_role(role) -> None:
    """Raise ``ValueError`` if ``role`` has no email address."""
    _validate_send_value(role, "email")


def validate_sms_role(role) -> None:
    """Raise ``ValueError`` if ``role`` has no cell phone number."""
    _validate_send_value(role, "cell")


def _validate_send_value(role, attr_name, nice_name=None):
    if not getattr(role, attr_name):
        raise ValueError(f'{role._meta.verbose_name} "{role}" has no {nice_name or attr_name}.')


def send_email(qi) -> None:
    """
    Send the email for a ``QueueItem``. Validates sender and receiver email addresses,
    attaches inline images and regular attachments, then sends via Anymail.
    Transitions the queue item to ``await`` on success, or ``error`` on permanent failure.
    Transient ESP errors (5xx, 408, 423, 429) raise ``AnymailTransientError`` for retry.
    """
    assert qi.anymail
    validate_email_role(qi.sender)
    validate_email_role(qi.receiver)

    detail = qi.anymail
    from_email = qi.sender.email
    to_email = qi.receiver.email
    body = detail.text
    html = detail.html
    subject = detail.subject
    email = EmailMultiAlternatives(subject, body, from_email, [to_email])
    for attachment in detail.attachments.all():
        if attachment.content_disposition_is_inline and attachment.content_id_string:
            content = attachment.get_content()
            cid = attach_inline_image(
                email,
                content,
                filename=attachment.filename,
                subtype=attachment.sub_type,
                idstring=attachment.content_id_string,
            )
            html = html.replace(f"cid:{attachment.content_id_string}", f"cid:{cid}")
        else:
            content = attachment.get_content()
            if content:
                email.attach(filename=attachment.filename, content=content, mimetype=attachment.mimetype)
    if html:
        email.attach_alternative(html, "text/html")
    try:
        email.send()
    except AnymailAPIError as e:
        status_code = getattr(e, "status_code", None)
        if status_code and (500 <= status_code < 600 or status_code in {408, 423, 429}):  # noqa: PLR2004
            raise AnymailTransientError from e
        else:
            raise e

    with lock_queue_item(qi.pk) as locked:
        if not locked:
            return
        anymail_status = email.anymail_status
        detail.message_id = anymail_status.message_id
        detail.save()
        if anymail_status.status & {"sent", "queued"}:
            qi.fast_transition("await")
        else:
            qi.result = f"Anymail status: {anymail_status.status}"
            qi.save(update_fields=["result"])
            qi.fast_transition("error")


class TwilioQueueItemHandler:
    """
    Handles sending SMS messages and syncing delivery status via the Twilio API.
    Instantiating this class with ``TWILIO_ACCOUNT_SID`` in settings initializes
    the Twilio client; without it the handler is a no-op.
    """

    twilio_client = None

    def __init__(
        self,
    ):
        if getattr(settings, "TWILIO_ACCOUNT_SID", None) and has_twilio:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN,
            )

    def send_sms(self, qi) -> None:
        """
        Send an SMS for the given ``QueueItem`` via Twilio. Transitions the item
        to ``await`` on success, or ``error`` on ``TwilioRestException``.
        """
        try:
            assert qi.sms
            validate_sms_role(qi.sender)
            validate_sms_role(qi.receiver)
            kwargs = {}
            status_callback = getattr(settings, "TWILIO_WEBHOOK_URL", False)
            if status_callback:
                kwargs["status_callback"] = status_callback
            message = self.twilio_client.messages.create(
                from_=qi.sender.cell.as_e164,
                to=qi.receiver.cell.as_e164,
                body=qi.sms.body,
                media_url=qi.sms.media_url,
                **kwargs,
            )
            with lock_queue_item(qi.pk) as locked:
                if not locked:
                    return
                err = f"\n{message.error_code} - {message.error_message}" if message.error_code else ""
                qi.result = f"{message.status}{err}"
                qi.sms.message_sid = message.sid
                qi.sms.save()
                qi.save()
                qi.fast_transition("await")
        except TwilioRestException as e:
            with lock_queue_item(qi.pk) as locked:
                if not locked:
                    return
                qi.fast_transition("error")
                qi.result = (
                    f"An error occurred while sending an SMS message through twilio.\n{e.__class__.__name__} : {e.msg}"
                )
                qi.save(update_fields=["result"])
                logger.exception("There was an error while sending sms for QueueItem %s", qi.pk)

    def pull_sms_status(self, qi) -> None:
        """Poll Twilio for messages sent since the queue item's date and update their status."""
        try:
            messages = self.twilio_client.messages.list(date_sent_after=qi.date())
            for message in messages:
                with transaction.atomic():
                    queue_item = (
                        QueueItem.objects.select_related(
                            "sms",
                        )
                        .select_for_update(skip_locked=True)
                        .prefetch_related("object_states_proxy")
                        .filter(sms__message_sid=message.sid, object_states_proxy__state__code="awaiting", method="sms")
                        .first()
                    )
                    if queue_item:
                        self.update_sms_qi(queue_item, message.status, message=message)
        except TwilioException:
            logger.exception("There was an error getting sms messages for syncing status.")

    def pull_sms_timeout_only(self) -> None:
        """
        Check awaiting SMS queue items that have exceeded the timeout window (default 2 hours).
        Fetches each message's current status from Twilio and transitions timed-out items to
        ``timeout`` if no final status is available.
        """
        timeout_hours = getattr(settings, "VDQ_TWILIO_SMS_TIMEOUT_HOURS", 2)
        queue = (
            QueueItem.objects.filter(
                object_states_proxy__state__code="awaiting",
                method="sms",
                sms__message_sid__isnull=False,
            )
            .order_by("queued")
            .annotate(timed_out=ExpressionWrapper(timezone.now() - F("done_since"), output_field=DurationField()))
            .filter(timed_out__gt=timedelta(hours=timeout_hours))
        )
        for item in queue:
            try:
                message = self.twilio_client.messages(item.sms.message_sid).fetch()
            except TwilioRestException:
                logger.exception("There was an error getting sms messages for syncing status (for timeout).")
                with lock_queue_item(item.pk) as locked:
                    if not locked and item.workflow_state.code == "awaiting":
                        return
                    timeout_queue_item(item, timeout_hours)
            else:
                # one last shot at seeing what the status is in twilio, cause maybe the webhook is delayed.
                with lock_queue_item(item.pk) as locked:
                    if not locked and item.workflow_state.code == "awaiting":
                        return
                    self.update_sms_qi(item, message.status, message=message)

    def update_sms_qi(self, queue_item, message_status, message=None, webhook=False, error_code="") -> None:
        """
        Update a ``QueueItem`` based on a Twilio ``message_status`` string.
        Transitions to ``succeed`` on delivery, ``error`` on failure, or ``timeout`` when the
        item has been awaiting longer than the configured timeout.
        """
        timeout_hours = getattr(settings, "VDQ_TWILIO_SMS_TIMEOUT_HOURS", 2)
        if message_status == "delivered":
            # save implied.
            queue_item.result = ""
            queue_item.save()
            queue_item.fast_transition("succeed")
            logger.info("QueueItem %s: %sDelivered SMS", queue_item.pk, "Webhook " if webhook else "")
        elif message_status in ("undelivered", "failed"):
            err = error_code
            if message:
                error_code = message.error_code
                err = f"\n{error_code} - {message.error_message}" if error_code else ""

            msg = (
                f"{'Webhook ' if webhook else ''}SMS Status:{message_status}{err}"
                "\nhttps://www.twilio.com/docs/api/messaging/message#delivery-related-errors"
                f"\nhttps://www.twilio.com/docs/api/errors/{error_code or ''}"
            )
            queue_item.result = msg
            queue_item.save(update_fields=["result"])
            queue_item.fast_transition("error")
        elif (timezone.now() - queue_item.done_since) > timedelta(hours=timeout_hours):
            # Timeout. Save implied.
            timeout_queue_item(queue_item, timeout_hours)


def timeout_queue_item(queue_item, timeout_hours) -> None:
    """Mark a ``QueueItem`` as timed out and transition it to the ``timeout`` state."""
    queue_item.result = (
        f"Status not received. Carrier did not confirm delivery.\nCancelled after timeout of {timeout_hours} hours."
    )
    queue_item.save()
    queue_item.fast_transition("timeout")


@receiver(tracking)
def handle_bounce(sender, event, esp_name, **kwargs) -> None:
    """
    Anymail tracking signal receiver. Processes ESP delivery events (delivered, bounced,
    rejected, failed, delayed) and transitions the matching ``QueueItem`` accordingly.
    Logs a warning for unknown ``message_id`` values and an error for unhandled exceptions.
    """
    try:
        with transaction.atomic():
            qi = QueueItem.objects.select_for_update().filter(anymail__message_id=event.message_id).first()
            if not qi:
                logger.warning("Tracking event %s for unknown message_id=%s", event.event_type, event.message_id)
                return
            raw_esp_event = event.esp_event
            match event.event_type:
                case "delivered":
                    qi.result = ""
                    qi.save(update_fields=["result"])
                    qi.fast_transition("succeed")
                case "queued" | "sent":
                    pass
                case "bounced" | "rejected":
                    reason = getattr(event, "reject_reason", "unknown")
                    qi.result = f"Email Rejected or Bounced. Reject Reason: {reason}"
                    qi.save(update_fields=["result"])
                    qi.fast_transition("error")
                    logger.warning("Bounced email for QueueItem %s. Raw: %s", qi.pk, raw_esp_event)
                case "failed":
                    qi.result = "Email Failed."
                    qi.save(update_fields=["result"])
                    qi.fast_transition("error")
                    logger.error("Failed email for QueueItem %s. Raw: %s", qi.pk, raw_esp_event)
                case "delayed":
                    qi.result = (
                        "ESP delayed. It should automatically retry later and hit back with another bounce again"
                    )
                    qi.save(update_fields=["result"])
                case _:
                    logger.info("Unhandled event %s for QueueItem %s. Raw: %s", event.event_type, qi.pk, raw_esp_event)
    except Exception as e:
        logger.exception(
            "There was an error while processing tracking event for a QueueItem.\nRaw event: %s\n",
            event,
        )
        raise e
