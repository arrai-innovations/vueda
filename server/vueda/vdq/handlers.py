"""Email and SMS send handlers and Twilio webhook processing for the VDQ."""

__all__ = (
    "DELIVERED_SMS_STATUSES",
    "FAILED_SMS_STATUSES",
    "IN_FLIGHT_SMS_STATUSES",
    "IN_FLIGHT_TRACKING_EVENTS",
    "TwilioQueueItemHandler",
    "handle_bounce",
    "send_email",
    "timeout_queue_item",
    "twilio_status_callback_url",
    "validate_email_role",
    "validate_sms_role",
)

import logging
from datetime import timedelta
from urllib.parse import parse_qsl
from urllib.parse import urlencode
from urllib.parse import urlsplit
from urllib.parse import urlunsplit

from anymail.exceptions import AnymailAPIError
from anymail.exceptions import AnymailUnsupportedFeature
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

from vueda.vdq.constants import TWILIO_QUEUE_ITEM_PARAM
from vueda.vdq.exceptions import AnymailTransientError
from vueda.vdq.exceptions import QueueItemLockError
from vueda.vdq.models import QueueItem
from vueda.vdq.tracking import get_email_tracking_strategy
from vueda.vdq.utils import lock_queue_item
from vueda.vdq.utils import with_locked_queue_item


logger = logging.getLogger(__name__)

# Twilio statuses that confirm delivery.
DELIVERED_SMS_STATUSES = frozenset({"delivered"})

# Twilio statuses that end delivery without reaching the recipient.
FAILED_SMS_STATUSES = frozenset({"undelivered", "failed"})

# Twilio statuses of a message that Twilio holds or has handed to the carrier, with its outcome still pending.
IN_FLIGHT_SMS_STATUSES = frozenset({"queued", "sending", "sent"})

# Anymail tracking events of a message that the ESP holds or has handed on, with its outcome still pending.
IN_FLIGHT_TRACKING_EVENTS = frozenset({"queued", "sent", "deferred"})


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


def _build_email(qi) -> EmailMultiAlternatives:
    """Build the email for a ``QueueItem`` with its inline images, attachments, and HTML alternative."""
    detail = qi.anymail
    from_email = qi.sender.email
    to_email = qi.receiver.email
    body = detail.text
    html = detail.html
    subject = detail.subject
    reply_to = [receiver.email for receiver in detail.reply_to.all()]
    email = EmailMultiAlternatives(subject, body, from_email, [to_email], reply_to=reply_to)
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
    return email


def _send_through_anymail(email) -> None:
    """Send ``email``. Transient ESP errors (5xx, 408, 423, 429) raise ``AnymailTransientError`` for retry."""
    try:
        email.send()
    except AnymailAPIError as e:
        status_code = getattr(e, "status_code", None)
        if status_code and (500 <= status_code < 600 or status_code in {408, 423, 429}):  # noqa: PLR2004
            raise AnymailTransientError from e
        else:
            raise e


def send_email(qi) -> None:
    """
    Send the email for a ``QueueItem``. Validates sender and receiver email addresses, attaches inline
    images and regular attachments, adds the tracking data from the configured ``EmailTrackingStrategy``,
    then sends via Anymail. Anymail raises ``AnymailUnsupportedFeature`` while it builds the request when
    the ESP accepts no such data, so the email is then sent once more without it.
    Transitions the queue item to ``await`` on success, or ``error`` on permanent failure. A status update
    that reached the item first keeps the state and ``result`` it set.
    Transient ESP errors (5xx, 408, 423, 429) raise ``AnymailTransientError`` for retry.
    """
    assert qi.anymail
    validate_email_role(qi.sender)
    validate_email_role(qi.receiver)

    detail = qi.anymail
    email = _build_email(qi)
    get_email_tracking_strategy().attach(email, qi)
    try:
        _send_through_anymail(email)
    except AnymailUnsupportedFeature as e:
        logger.info("Anymail refused the email for QueueItem %s: %s. Sending it without tracking data.", qi.pk, e)
        email = _build_email(qi)
        _send_through_anymail(email)

    anymail_status = email.anymail_status

    def record_send(locked):
        if not locked:
            return
        detail.message_id = anymail_status.message_id
        detail.save(update_fields=["message_id"])
        if locked.workflow_state.code != "sending":
            # A tracking event found the item by its tracking data and already applied the ESP's answer.
            return
        if anymail_status.status & {"sent", "queued"}:
            locked.fast_transition("await")
        else:
            locked.result = f"Anymail status: {anymail_status.status}"
            locked.save(update_fields=["result"])
            locked.fast_transition("error")

    try:
        with_locked_queue_item(qi.pk, record_send)
    except QueueItemLockError as exc:
        raise QueueItemLockError(
            f"{exc} The ESP accepted the email with message ID {anymail_status.message_id!r}."
        ) from exc


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
        Send an SMS for the given ``QueueItem`` via Twilio. The status callback URL carries the item's
        primary key, so a status update can find the item before VDQ stores the message SID. Transitions
        the item to ``await`` on success, or ``error`` on ``TwilioRestException``. A status update that
        reached the item first keeps the state and ``result`` it set.
        """
        try:
            assert qi.sms
            validate_sms_role(qi.sender)
            validate_sms_role(qi.receiver)
            kwargs = {}
            status_callback = getattr(settings, "TWILIO_WEBHOOK_URL", False)
            if status_callback:
                kwargs["status_callback"] = twilio_status_callback_url(status_callback, qi)
            message = self.twilio_client.messages.create(
                from_=qi.sender.cell.as_e164,
                to=qi.receiver.cell.as_e164,
                body=qi.sms.body,
                media_url=qi.sms.media_url,
                **kwargs,
            )
        except TwilioRestException as e:
            result = f"An error occurred while sending an SMS message through twilio.\n{e.__class__.__name__} : {e.msg}"

            def record_rejection(locked):
                if not locked:
                    return
                locked.fast_transition("error")
                locked.result = result
                locked.save(update_fields=["result"])

            with_locked_queue_item(qi.pk, record_rejection)
            logger.exception("There was an error while sending sms for QueueItem %s", qi.pk)
            return

        def record_send(locked):
            if not locked:
                return
            qi.sms.message_sid = message.sid
            qi.sms.save(update_fields=["message_sid"])
            if locked.workflow_state.code != "sending":
                # A status callback found the item by its key and already applied Twilio's answer.
                return
            err = f"\n{message.error_code} - {message.error_message}" if message.error_code else ""
            locked.result = f"{message.status}{err}"
            locked.save(update_fields=["result"])
            locked.fast_transition("await")

        try:
            with_locked_queue_item(qi.pk, record_send)
        except QueueItemLockError as exc:
            raise QueueItemLockError(f"{exc} Twilio accepted the SMS with message SID {message.sid!r}.") from exc

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
                    # A held row is being updated elsewhere; the next run sees the result.
                    if not locked or locked.workflow_state.code != "awaiting":
                        continue
                    timeout_queue_item(locked, timeout_hours)
            else:
                # one last shot at seeing what the status is in twilio, cause maybe the webhook is delayed.
                with lock_queue_item(item.pk) as locked:
                    if not locked or locked.workflow_state.code != "awaiting":
                        continue
                    self.update_sms_qi(locked, message.status, message=message)

    def update_sms_qi(self, queue_item, message_status, message=None, webhook=False, error_code="") -> None:
        """
        Update a ``QueueItem`` based on a Twilio ``message_status`` string.
        Transitions to ``succeed`` on ``delivered`` and to ``error`` on ``undelivered`` or ``failed``, from
        ``sending`` as well as from ``awaiting``. Any other status moves a ``sending`` item to ``awaiting``
        when it is in flight (``queued``, ``sending``, ``sent``), and times out an ``awaiting`` item that has
        waited longer than the configured timeout. Otherwise it changes nothing.
        """
        timeout_hours = getattr(settings, "VDQ_TWILIO_SMS_TIMEOUT_HOURS", 2)
        if message_status in DELIVERED_SMS_STATUSES:
            # save implied.
            queue_item.result = ""
            queue_item.save()
            queue_item.fast_transition("succeed")
            logger.info("QueueItem %s: %sDelivered SMS", queue_item.pk, "Webhook " if webhook else "")
        elif message_status in FAILED_SMS_STATUSES:
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
        elif queue_item.workflow_state.code == "sending":
            if message_status in IN_FLIGHT_SMS_STATUSES:
                # Twilio has the message, so the item waits for its final status from here on.
                queue_item.fast_transition("await")
        elif queue_item.workflow_state.code == "awaiting" and (timezone.now() - queue_item.done_since) > timedelta(
            hours=timeout_hours
        ):
            # The item waited past the window for a final status, whatever status Twilio reports instead.
            # Save implied.
            timeout_queue_item(queue_item, timeout_hours)


def twilio_status_callback_url(base_url, queue_item) -> str:
    """Return ``base_url`` with the queue item's primary key added as the ``queue_item`` query parameter."""
    parts = urlsplit(base_url)
    query = [(name, value) for name, value in parse_qsl(parts.query) if name != TWILIO_QUEUE_ITEM_PARAM]
    query.append((TWILIO_QUEUE_ITEM_PARAM, str(queue_item.pk)))
    return urlunsplit(parts._replace(query=urlencode(query)))


def timeout_queue_item(queue_item, timeout_hours) -> None:
    """Mark a ``QueueItem`` as timed out and transition it to the ``timeout`` state."""
    queue_item.result = (
        f"Status not received. Carrier did not confirm delivery.\nCancelled after timeout of {timeout_hours} hours."
    )
    queue_item.save()
    queue_item.fast_transition("timeout")


def _find_queue_item_by_tracking_data(event):
    """
    Lock and return the queue item that the configured ``EmailTrackingStrategy`` finds for ``event``.

    Logs and returns ``None`` when the strategy finds no item, or when the item stores a different message ID
    than the event carries. The item's message ID is stored from the event when the item has none yet.
    """
    found = get_email_tracking_strategy().find_queue_item(event)
    qi = None
    if found is not None:
        qi = QueueItem.objects.select_for_update().filter(pk=found.pk, method="email").first()
    if qi is None:
        logger.warning("Tracking event %s for unknown message_id=%s", event.event_type, event.message_id)
        return None
    stored_message_id = qi.anymail.message_id
    if stored_message_id and stored_message_id != event.message_id:
        logger.warning(
            "Tracking event %s with message_id=%s names QueueItem %s, which stores message_id=%s. Ignoring it.",
            event.event_type,
            event.message_id,
            qi.pk,
            stored_message_id,
        )
        return None
    if not stored_message_id and event.message_id:
        qi.anymail.message_id = event.message_id
        qi.anymail.save(update_fields=["message_id"])
    return qi


@receiver(tracking)
def handle_bounce(sender, event, esp_name, **kwargs) -> None:
    """
    Anymail tracking signal receiver. Processes ESP delivery events (delivered, bounced,
    rejected, failed, deferred) and transitions the matching ``QueueItem`` accordingly.
    An event finds its item by ``message_id`` first, then through the configured
    ``EmailTrackingStrategy``, which also stores the ``message_id`` on an item that has none.
    Logs a warning for an event that finds no item and an error for unhandled exceptions.
    """
    try:
        with transaction.atomic():
            qi = None
            if event.message_id:
                qi = QueueItem.objects.select_for_update().filter(anymail__message_id=event.message_id).first()
            if not qi:
                qi = _find_queue_item_by_tracking_data(event)
            if not qi:
                return
            if qi.workflow_state.code == "sending" and event.event_type in IN_FLIGHT_TRACKING_EVENTS:
                # The ESP has the message, so the item waits for its final status from here on.
                qi.fast_transition("await")
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
                case "deferred":
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
