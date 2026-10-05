import logging
from datetime import timedelta
from types import SimpleNamespace

import pytest
from anymail.exceptions import AnymailAPIError
from anymail.exceptions import AnymailUnsupportedFeature
from django.core import mail
from django.core.files.base import ContentFile
from django.utils import timezone

from tests.utils import set_email_backend
from vueda.vdq.exceptions import AnymailTransientError
from vueda.vdq.handlers import TwilioQueueItemHandler
from vueda.vdq.handlers import handle_bounce
from vueda.vdq.handlers import send_email
from vueda.vdq.handlers import timeout_queue_item
from vueda.vdq.handlers import twilio_status_callback_url
from vueda.vdq.handlers import validate_email_role
from vueda.vdq.handlers import validate_sms_role
from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import AnyMailQueueItemReceiverReplyTo
from vueda.vdq.models import QueueItem
from vueda.vdq.models import Receiver
from vueda.vdq.tracking import EmailTrackingStrategy


@pytest.mark.django_db
def test_validate_email_role_requires_email(email_sender):
    email_sender.email = ""
    email_sender.save(update_fields=["email"])
    with pytest.raises(ValueError):
        validate_email_role(email_sender)


@pytest.mark.django_db
def test_validate_sms_role_requires_cell(sms_sender):
    sms_sender.cell = None
    sms_sender.save(update_fields=["cell"])
    with pytest.raises(ValueError):
        validate_sms_role(sms_sender)


def _create_attachment(filename: str, mimetype: str, content: bytes, *, inline: bool = False, cid: str = ""):
    attachment = AnyMailQueueItemAttachment.objects.create(
        filename=filename,
        mimetype=mimetype,
        content_id_string=cid,
        content_disposition_is_inline=inline,
    )
    attachment.attachment.save(filename, ContentFile(content))
    return attachment


@pytest.mark.django_db
def test_send_email_with_inline_and_regular_attachments(settings, monkeypatch, queue_item_email):
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")

    detail = AnyMailQueueItem.objects.create(
        queue_item=queue_item_email,
        subject="Subject",
        text="Plain text",
        html='<p>Hi<img src="cid:logo"></p>',
    )
    inline_attachment = _create_attachment(
        "inline.png",
        "image/png",
        b"inline-bytes",
        inline=True,
        cid="logo",
    )
    file_attachment = _create_attachment("document.txt", "text/plain", b"document-bytes", cid="")
    detail.attachments.add(inline_attachment, file_attachment)

    generated_cid = "generated-inline"

    def fake_attach_inline_image(email_message, content, filename, subtype, idstring):
        assert content == inline_attachment.get_content()
        assert filename == inline_attachment.filename
        assert idstring == inline_attachment.content_id_string
        return generated_cid

    original_send = send_email.__globals__["EmailMultiAlternatives"].send

    def fake_send(self, *args, **kwargs):
        self.anymail_status = SimpleNamespace(message_id="fake-message-id", status={"sent"})
        return original_send(self, *args, **kwargs)

    monkeypatch.setattr("vueda.vdq.handlers.attach_inline_image", fake_attach_inline_image)
    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    send_email(queue_item_email)

    assert detail.message_id == "fake-message-id"
    queue_item_email.refresh_from_db()
    assert queue_item_email.workflow_state.code == "awaiting"

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.subject == "Subject"
    assert message.body == "Plain text"
    html_content, mimetype = message.alternatives[0]
    assert mimetype == "text/html"
    assert "cid:logo" not in html_content
    assert f"cid:{generated_cid}" in html_content
    assert message.attachments[0][0] == "document.txt"


@pytest.mark.django_db
def test_send_email_sets_reply_to(settings, monkeypatch, queue_item_email):
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")
    detail = AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    reply_to = Receiver.objects.create(email="reply@domain.invalid", name="Reply", cell="+18005550108")
    AnyMailQueueItemReceiverReplyTo.objects.create(receiver=reply_to, anymail_queue_item=detail)

    original_send = send_email.__globals__["EmailMultiAlternatives"].send

    def fake_send(self, *args, **kwargs):
        self.anymail_status = SimpleNamespace(message_id="fake-message-id", status={"sent"})
        return original_send(self, *args, **kwargs)

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    send_email(queue_item_email)

    assert mail.outbox[0].reply_to == ["reply@domain.invalid"]


@pytest.mark.django_db
def test_send_email_records_error_status(settings, monkeypatch, queue_item_email):
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")

    detail = AnyMailQueueItem.objects.create(
        queue_item=queue_item_email,
        subject="Subject",
        text="Plain text",
        html="<p>Hi</p>",
    )

    def fake_send(self, *args, **kwargs):
        self.anymail_status = SimpleNamespace(message_id="message", status={"failed"})
        return 1

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    send_email(queue_item_email)

    detail.refresh_from_db()
    assert detail.message_id == "message"
    queue_item_email.refresh_from_db()
    assert queue_item_email.workflow_state.code == "errored"
    assert "Anymail status" in queue_item_email.result


@pytest.mark.django_db
def test_send_email_transient_error(settings, monkeypatch, queue_item_email):
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")

    AnyMailQueueItem.objects.create(
        queue_item=queue_item_email,
        subject="Subject",
        text="Plain text",
    )

    def fake_send(self, *args, **kwargs):
        raise AnymailAPIError("broken", email_message=self, status_code=500)

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    with pytest.raises(AnymailTransientError):
        send_email(queue_item_email)


@pytest.mark.django_db
def test_send_email_non_transient_error(settings, monkeypatch, queue_item_email):
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")

    AnyMailQueueItem.objects.create(
        queue_item=queue_item_email,
        subject="Subject",
        text="Plain text",
    )

    def fake_send(self, *args, **kwargs):
        raise AnymailAPIError("broken", email_message=self, status_code=400)

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    with pytest.raises(AnymailAPIError):
        send_email(queue_item_email)


@pytest.mark.django_db
def test_twilio_send_sms_success(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = None
    settings.TWILIO_AUTH_TOKEN = None

    message_calls = {}

    class FakeMessages:
        def create(self, **kwargs):
            message_calls.update(kwargs)
            return SimpleNamespace(
                error_code=None,
                error_message="",
                status="sent",
                sid="SM123",
            )

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=FakeMessages())

    handler.send_sms(queue_item_sms)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.result == "sent"
    assert queue_item_sms.sms.message_sid == "SM123"
    assert queue_item_sms.workflow_state.code == "awaiting"
    assert message_calls["from_"] == queue_item_sms.sender.cell.as_e164
    assert message_calls["to"] == queue_item_sms.receiver.cell.as_e164


@pytest.mark.django_db
def test_twilio_send_sms_handles_error(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = None
    settings.TWILIO_AUTH_TOKEN = None

    class FakeTwilioRestException(Exception):  # noqa:N818
        def __init__(self, msg):
            self.msg = msg

    monkeypatch.setattr("vueda.vdq.handlers.TwilioRestException", FakeTwilioRestException)

    class FakeMessages:
        def create(self, **kwargs):
            raise FakeTwilioRestException("boom")

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=FakeMessages())

    handler.send_sms(queue_item_sms)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.workflow_state.code == "errored"
    assert "boom" in queue_item_sms.result


@pytest.mark.django_db
def test_twilio_pull_sms_status(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = "sid"
    settings.TWILIO_AUTH_TOKEN = "token"

    queue_item_sms.fast_transition("await")
    queue_item_sms.sms.message_sid = "SM001"
    queue_item_sms.sms.save()

    message = SimpleNamespace(sid="SM001", status="delivered")

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=SimpleNamespace(list=lambda **kwargs: [message]))

    calls = {}

    def fake_update(queue_item, message_status, message=None, webhook=False):
        calls.update(
            {
                "queue_item": queue_item,
                "status": message_status,
                "webhook": webhook,
            }
        )

    monkeypatch.setattr(handler, "update_sms_qi", fake_update)

    handler.pull_sms_status(queue_item_sms.queued)
    assert calls["queue_item"].pk == queue_item_sms.pk
    assert calls["status"] == "delivered"


@pytest.mark.django_db
def test_twilio_pull_sms_timeout_only(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = "sid"
    settings.TWILIO_AUTH_TOKEN = "token"
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1

    queue_item_sms.fast_transition("await")
    queue_item_sms.sms.message_sid = "SM002"
    queue_item_sms.sms.save()
    queue_item_sms.done_since = timezone.now() - timedelta(hours=3)
    queue_item_sms.save(update_fields=["done_since"])

    class FakeMessage:
        status = "delivered"
        error_code = None
        error_message = ""
        sid = "SM002"

    class FakeMessageResource:
        def __init__(self, sid):
            assert sid == "SM002"

        def fetch(self):
            return FakeMessage()

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=lambda sid: FakeMessageResource(sid))

    calls = {}

    def fake_update(queue_item, message_status, message=None, webhook=False):
        calls["status"] = message_status

    monkeypatch.setattr(handler, "update_sms_qi", fake_update)

    handler.pull_sms_timeout_only()

    assert calls["status"] == "delivered"


@pytest.mark.django_db
def test_twilio_pull_sms_timeout_only_handles_fetch_error(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = "Test_Twilio_Account_SID"
    settings.TWILIO_AUTH_TOKEN = "Test_Twilio_Auth_Token"
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1

    queue_item_sms.fast_transition("await")
    queue_item_sms.sms.message_sid = "SM003"
    queue_item_sms.sms.save()
    queue_item_sms.done_since = timezone.now() - timedelta(hours=3)
    queue_item_sms.save(update_fields=["done_since"])

    class FakeTwilioRestException(Exception):  # noqa:N818
        def __init__(self, msg="err"):
            self.msg = msg

    monkeypatch.setattr("vueda.vdq.handlers.TwilioRestException", FakeTwilioRestException)

    def fake_messages(sid):
        raise FakeTwilioRestException()

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=fake_messages)

    triggered = {}

    def fake_timeout(queue_item, timeout_hours):
        triggered["timeout"] = (queue_item.pk, timeout_hours)

    monkeypatch.setattr("vueda.vdq.handlers.timeout_queue_item", fake_timeout)

    handler.pull_sms_timeout_only()

    assert triggered["timeout"][0] == queue_item_sms.pk
    assert triggered["timeout"][1] == 1


@pytest.mark.django_db
def test_update_sms_qi_delivered(queue_item_sms):
    queue_item_sms.fast_transition("await")
    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=lambda sid: None)

    handler.update_sms_qi(queue_item_sms, "delivered", message=SimpleNamespace(error_code=None, error_message=""))

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.result == ""
    assert queue_item_sms.workflow_state.code == "succeeded"


@pytest.mark.django_db
def test_update_sms_qi_failure(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = "sid"
    settings.TWILIO_AUTH_TOKEN = "token"

    queue_item_sms.fast_transition("await")
    handler = TwilioQueueItemHandler()

    handler.update_sms_qi(queue_item_sms, "failed")

    assert "SMS Status" in queue_item_sms.result
    queue_item_sms.refresh_from_db()
    assert queue_item_sms.workflow_state.code == "errored"


@pytest.mark.django_db
def test_update_sms_qi_timeout(settings, monkeypatch, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = "sid"
    settings.TWILIO_AUTH_TOKEN = "token"
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1

    queue_item_sms.fast_transition("await")
    queue_item_sms.done_since = timezone.now() - timedelta(hours=3)
    queue_item_sms.save(update_fields=["done_since"])

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=lambda sid: None)

    triggered = {}

    def fake_timeout(queue_item, timeout_hours):
        triggered["timeout"] = (queue_item.pk, timeout_hours)

    monkeypatch.setattr("vueda.vdq.handlers.timeout_queue_item", fake_timeout)

    handler.update_sms_qi(queue_item_sms, "sent")

    assert triggered["timeout"][0] == queue_item_sms.pk


@pytest.mark.django_db
def test_timeout_queue_item(queue_item_sms):
    queue_item_sms.fast_transition("await")
    timeout_queue_item(queue_item_sms, 2)
    queue_item_sms.refresh_from_db()
    assert "Status not received" in queue_item_sms.result
    assert queue_item_sms.workflow_state.code == "unconfirmed"


@pytest.mark.django_db
def test_handle_bounce_updates_states(monkeypatch, queue_item_email):
    sender = queue_item_email.sender
    receiver = queue_item_email.receiver

    def make_queue_item(message_id):
        qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
        detail = AnyMailQueueItem.objects.create(queue_item=qi, subject="Subj", text="Body")
        detail.message_id = message_id
        detail.save(update_fields=["message_id"])
        qi.fast_transition("send")
        qi.fast_transition("await")
        return qi

    delivered_qi = make_queue_item("mid-delivered")
    event = SimpleNamespace(message_id="mid-delivered", event_type="delivered", esp_event={})
    handle_bounce(None, event, "esp")
    delivered_qi.refresh_from_db()
    assert delivered_qi.workflow_state.code == "succeeded"

    queued_qi = make_queue_item("mid-queued")
    event = SimpleNamespace(message_id="mid-queued", event_type="queued", esp_event={})
    handle_bounce(None, event, "esp")
    queued_qi.refresh_from_db()
    assert queued_qi.workflow_state.code == "awaiting"

    bounced_qi = make_queue_item("mid-bounced")
    event = SimpleNamespace(message_id="mid-bounced", event_type="bounced", esp_event={}, reject_reason="denied")
    handle_bounce(None, event, "esp")
    bounced_qi.refresh_from_db()
    assert bounced_qi.workflow_state.code == "errored"
    assert "Reject Reason" in bounced_qi.result

    failed_qi = make_queue_item("mid-failed")
    event = SimpleNamespace(message_id="mid-failed", event_type="failed", esp_event={})
    handle_bounce(None, event, "esp")
    failed_qi.refresh_from_db()
    assert failed_qi.workflow_state.code == "errored"
    assert failed_qi.result == "Email Failed."

    deferred_qi = make_queue_item("mid-deferred")
    event = SimpleNamespace(message_id="mid-deferred", event_type="deferred", esp_event={})
    handle_bounce(None, event, "esp")
    deferred_qi.refresh_from_db()
    assert "ESP delayed" in deferred_qi.result


@pytest.mark.django_db
def test_handle_bounce_unknown_message(caplog):
    event = SimpleNamespace(message_id="unknown", event_type="delivered", esp_event={})
    with caplog.at_level(logging.WARNING):
        handle_bounce(None, event, "esp")

    assert "Tracking event" in caplog.text


@pytest.mark.django_db
def test_handle_bounce_logs_and_raises(caplog, monkeypatch):
    event = SimpleNamespace(message_id="raise", event_type="delivered", esp_event={"raw": True})

    def boom(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(QueueItem.objects, "select_for_update", boom)

    with caplog.at_level(logging.ERROR):
        with pytest.raises(RuntimeError):
            handle_bounce(None, event, "esp")

    assert "There was an error while processing tracking event" in caplog.text


def _anymail_params(message):
    return message.anymail_test_params


class TagEmailTrackingStrategy(EmailTrackingStrategy):
    """Carries the queue item's key in an Anymail tag, for the custom-strategy tests."""

    def attach(self, email, queue_item):
        email.tags = [f"vdq-{queue_item.pk}"]

    def find_queue_item(self, event):
        for tag in getattr(event, "tags", None) or []:
            if tag.startswith("vdq-"):
                return QueueItem.objects.filter(pk=int(tag.removeprefix("vdq-"))).first()
        return None


@pytest.mark.django_db
def test_send_email_carries_the_queue_item_key_in_metadata(settings, queue_item_email):
    set_email_backend(settings, "anymail.backends.test.EmailBackend")
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")

    send_email(queue_item_email)

    assert _anymail_params(mail.outbox[0])["metadata"] == {"vdq_queue_item": str(queue_item_email.pk)}
    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == "0"
    assert queue_item_email.workflow_state.code == "awaiting"


@pytest.mark.django_db
def test_send_email_sends_once_without_tracking_data_when_the_esp_refuses_it(
    settings, monkeypatch, caplog, queue_item_email
):
    set_email_backend(settings, "anymail.backends.test.EmailBackend")
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")

    def refuse_metadata(self, metadata):
        self.unsupported_feature("metadata")

    monkeypatch.setattr("anymail.backends.test.TestPayload.set_metadata", refuse_metadata)

    with caplog.at_level(logging.INFO, logger="vueda.vdq.handlers"):
        send_email(queue_item_email)

    assert len(mail.outbox) == 1
    assert "metadata" not in _anymail_params(mail.outbox[0])
    assert "Sending it without tracking data" in caplog.text
    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == "0"
    assert queue_item_email.workflow_state.code == "awaiting"


@pytest.mark.django_db
def test_send_email_raises_an_unsupported_feature_unrelated_to_tracking_data(settings, monkeypatch, queue_item_email):
    set_email_backend(settings, "anymail.backends.test.EmailBackend")
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")

    def refuse_reply_to(self, emails):
        self.unsupported_feature("reply_to")

    monkeypatch.setattr("anymail.backends.test.TestPayload.set_reply_to", refuse_reply_to)

    with pytest.raises(AnymailUnsupportedFeature):
        send_email(queue_item_email)

    assert mail.outbox == []


@pytest.mark.django_db
def test_send_email_with_the_no_op_strategy_sends_without_tracking_data(settings, caplog, queue_item_email):
    set_email_backend(settings, "anymail.backends.test.EmailBackend")
    settings.VDQ_EMAIL_TRACKING_STRATEGY = "vueda.vdq.tracking.EmailTrackingStrategy"
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")

    with caplog.at_level(logging.INFO, logger="vueda.vdq.handlers"):
        send_email(queue_item_email)

    assert len(mail.outbox) == 1
    assert "metadata" not in _anymail_params(mail.outbox[0])
    assert "tracking data" not in caplog.text
    queue_item_email.refresh_from_db()
    assert queue_item_email.workflow_state.code == "awaiting"


@pytest.mark.django_db
def test_send_email_uses_a_custom_strategy_from_settings(settings, queue_item_email):
    set_email_backend(settings, "anymail.backends.test.EmailBackend")
    settings.VDQ_EMAIL_TRACKING_STRATEGY = TagEmailTrackingStrategy
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")

    send_email(queue_item_email)

    params = _anymail_params(mail.outbox[0])
    assert params["tags"] == [f"vdq-{queue_item_email.pk}"]
    assert "metadata" not in params


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("event_type", "expected_state", "expected_result"),
    [
        ("delivered", "succeeded", ""),
        ("bounced", "errored", "Email Rejected or Bounced. Reject Reason: denied"),
        ("queued", "awaiting", ""),
    ],
)
def test_send_email_keeps_the_state_a_tracking_event_set_first(
    settings, monkeypatch, queue_item_email, event_type, expected_state, expected_result
):
    """A tracking event that arrives before the message ID is stored applies, and the send keeps its result."""
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    event = SimpleNamespace(
        message_id="mid-race",
        event_type=event_type,
        esp_event={},
        reject_reason="denied",
        metadata={"vdq_queue_item": str(queue_item_email.pk)},
    )

    def fake_send(self, *args, **kwargs):
        handle_bounce(None, event, "esp")
        self.anymail_status = SimpleNamespace(message_id="mid-race", status={"sent"})
        return 1

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    send_email(queue_item_email)

    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == "mid-race"
    assert queue_item_email.workflow_state.code == expected_state
    assert queue_item_email.result == expected_result


@pytest.mark.django_db
def test_twilio_send_sms_adds_the_queue_item_key_to_the_status_callback(settings, queue_item_sms):
    settings.TWILIO_ACCOUNT_SID = None
    settings.TWILIO_AUTH_TOKEN = None
    settings.TWILIO_WEBHOOK_URL = "https://example.com/vueda.vdq/twilio-status-callback/?env=test"

    message_calls = {}

    class FakeMessages:
        def create(self, **kwargs):
            message_calls.update(kwargs)
            return SimpleNamespace(error_code=None, error_message="", status="sent", sid="SM123")

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=FakeMessages())

    handler.send_sms(queue_item_sms)

    assert message_calls["status_callback"] == (
        f"https://example.com/vueda.vdq/twilio-status-callback/?env=test&queue_item={queue_item_sms.pk}"
    )


def test_twilio_status_callback_url_replaces_an_existing_key():
    url = twilio_status_callback_url("https://example.com/hook/?queue_item=1&a=b", SimpleNamespace(pk=7))
    assert url == "https://example.com/hook/?a=b&queue_item=7"


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("message_status", "expected_state", "expected_result"),
    [
        ("delivered", "succeeded", ""),
        ("undelivered", "errored", "Webhook SMS Status:undelivered"),
        ("sent", "awaiting", ""),
    ],
)
def test_twilio_send_sms_keeps_the_state_a_status_callback_set_first(
    settings, queue_item_sms, message_status, expected_state, expected_result
):
    """A status callback that arrives before the SID is stored applies, and the send keeps its result."""
    settings.TWILIO_ACCOUNT_SID = None
    settings.TWILIO_AUTH_TOKEN = None
    handler = TwilioQueueItemHandler()

    class FakeMessages:
        def create(self, **kwargs):
            callback_item = QueueItem.objects.select_related("sms").get(pk=queue_item_sms.pk)
            callback_item.sms.message_sid = "SM123"
            callback_item.sms.save(update_fields=["message_sid"])
            handler.update_sms_qi(callback_item, message_status, webhook=True)
            return SimpleNamespace(error_code=None, error_message="", status="queued", sid="SM123")

    handler.twilio_client = SimpleNamespace(messages=FakeMessages())

    handler.send_sms(queue_item_sms)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.sms.message_sid == "SM123"
    assert queue_item_sms.workflow_state.code == expected_state
    assert queue_item_sms.result.startswith(expected_result)
    assert "queued" not in queue_item_sms.result


@pytest.mark.django_db
@pytest.mark.parametrize("message_status", ["queued", "sending", "sent"])
def test_update_sms_qi_moves_a_sending_item_to_awaiting_on_an_in_flight_status(
    settings, queue_item_sms, message_status
):
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1
    queue_item_sms.done_since = timezone.now() - timedelta(hours=3)
    queue_item_sms.save(update_fields=["done_since"])
    handler = TwilioQueueItemHandler()

    handler.update_sms_qi(queue_item_sms, message_status, webhook=True)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.workflow_state.code == "awaiting"


@pytest.mark.django_db
@pytest.mark.parametrize("message_status", ["accepted", "canceled", "read", "partially_delivered"])
def test_update_sms_qi_times_out_an_awaiting_item_on_a_status_vdq_does_not_handle(
    settings, monkeypatch, queue_item_sms, message_status
):
    """An item past the window times out on any status that is neither delivered nor failed."""
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1
    queue_item_sms.fast_transition("await")
    queue_item_sms.done_since = timezone.now() - timedelta(hours=3)
    queue_item_sms.save(update_fields=["done_since"])
    handler = TwilioQueueItemHandler()

    handler.update_sms_qi(queue_item_sms, message_status, webhook=True)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.workflow_state.code == "unconfirmed"
    assert "Status not received" in queue_item_sms.result


@pytest.mark.django_db
def test_update_sms_qi_leaves_an_awaiting_item_inside_the_window_on_a_status_vdq_does_not_handle(
    settings, queue_item_sms
):
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1
    queue_item_sms.fast_transition("await")
    handler = TwilioQueueItemHandler()

    handler.update_sms_qi(queue_item_sms, "accepted", webhook=True)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.workflow_state.code == "awaiting"
    assert queue_item_sms.result == ""


@pytest.mark.django_db
def test_update_sms_qi_ignores_a_status_vdq_does_not_handle(settings, queue_item_sms):
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1
    queue_item_sms.done_since = timezone.now() - timedelta(hours=3)
    queue_item_sms.save(update_fields=["done_since"])
    handler = TwilioQueueItemHandler()

    handler.update_sms_qi(queue_item_sms, "partially_delivered", webhook=True)

    queue_item_sms.refresh_from_db()
    assert queue_item_sms.workflow_state.code == "sending"
    assert queue_item_sms.result == ""


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("event_type", "expected_state"),
    [
        ("delivered", "succeeded"),
        ("bounced", "errored"),
        ("queued", "awaiting"),
        ("sent", "awaiting"),
        ("deferred", "awaiting"),
        ("opened", "sending"),
    ],
)
def test_handle_bounce_finds_a_sending_item_by_metadata_and_stores_the_message_id(
    queue_item_email, event_type, expected_state
):
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    event = SimpleNamespace(
        message_id="mid-new",
        event_type=event_type,
        esp_event={},
        reject_reason="denied",
        metadata={"vdq_queue_item": str(queue_item_email.pk)},
    )

    handle_bounce(None, event, "esp")

    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == "mid-new"
    assert queue_item_email.workflow_state.code == expected_state


@pytest.mark.django_db
def test_handle_bounce_ignores_metadata_that_names_an_item_with_another_message_id(caplog, queue_item_email):
    AnyMailQueueItem.objects.create(
        queue_item=queue_item_email, subject="Subject", text="Plain text", message_id="mid-a"
    )
    queue_item_email.fast_transition("await")
    event = SimpleNamespace(
        message_id="mid-b",
        event_type="delivered",
        esp_event={},
        metadata={"vdq_queue_item": str(queue_item_email.pk)},
    )

    with caplog.at_level(logging.WARNING):
        handle_bounce(None, event, "esp")

    assert "which stores message_id=mid-a" in caplog.text
    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == "mid-a"
    assert queue_item_email.workflow_state.code == "awaiting"


@pytest.mark.django_db
def test_handle_bounce_drops_an_event_whose_metadata_finds_no_item(caplog, queue_item_email):
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    event = SimpleNamespace(
        message_id="mid-orphan",
        event_type="delivered",
        esp_event={},
        metadata={"vdq_queue_item": str(queue_item_email.pk + 1000)},
    )

    with caplog.at_level(logging.WARNING):
        handle_bounce(None, event, "esp")

    assert "unknown message_id=mid-orphan" in caplog.text
    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == ""
    assert queue_item_email.workflow_state.code == "sending"


@pytest.mark.django_db
def test_handle_bounce_does_not_match_an_item_by_an_empty_message_id(caplog, queue_item_email):
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    event = SimpleNamespace(message_id="", event_type="delivered", esp_event={}, metadata={})

    with caplog.at_level(logging.WARNING):
        handle_bounce(None, event, "esp")

    assert "Tracking event" in caplog.text
    queue_item_email.refresh_from_db()
    assert queue_item_email.workflow_state.code == "sending"


@pytest.mark.django_db
def test_handle_bounce_uses_a_custom_strategy_and_still_checks_the_message_id(settings, caplog, queue_item_email):
    settings.VDQ_EMAIL_TRACKING_STRATEGY = f"{__name__}.TagEmailTrackingStrategy"
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    tags = [f"vdq-{queue_item_email.pk}"]

    handle_bounce(None, SimpleNamespace(message_id="mid-tag", event_type="sent", esp_event={}, tags=tags), "esp")

    queue_item_email.refresh_from_db()
    assert queue_item_email.anymail.message_id == "mid-tag"
    assert queue_item_email.workflow_state.code == "awaiting"

    with caplog.at_level(logging.WARNING):
        handle_bounce(
            None, SimpleNamespace(message_id="mid-other", event_type="delivered", esp_event={}, tags=tags), "esp"
        )

    assert "which stores message_id=mid-tag" in caplog.text
    queue_item_email.refresh_from_db()
    assert queue_item_email.workflow_state.code == "awaiting"
