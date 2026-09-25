import logging
from datetime import timedelta
from types import SimpleNamespace

import pytest
from anymail.exceptions import AnymailAPIError
from django.core import mail
from django.core.files.base import ContentFile
from django.utils import timezone

from tests.utils import set_email_backend
from vueda.vdq.exceptions import AnymailTransientError
from vueda.vdq.handlers import TwilioQueueItemHandler
from vueda.vdq.handlers import handle_bounce
from vueda.vdq.handlers import send_email
from vueda.vdq.handlers import timeout_queue_item
from vueda.vdq.handlers import validate_email_role
from vueda.vdq.handlers import validate_sms_role
from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import AnyMailQueueItemReceiverReplyTo
from vueda.vdq.models import QueueItem
from vueda.vdq.models import Receiver


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

    handler.update_sms_qi(queue_item_sms, "accepted")

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

    delayed_qi = make_queue_item("mid-delayed")
    event = SimpleNamespace(message_id="mid-delayed", event_type="delayed", esp_event={})
    handle_bounce(None, event, "esp")
    delayed_qi.refresh_from_db()
    assert "ESP delayed" in delayed_qi.result


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
