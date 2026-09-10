import sys
from http import HTTPStatus
from types import ModuleType
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.urls import reverse

from tests.conftest import response_body
from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SMSQueueItem


@pytest.mark.django_db
def test_twilio_webhook_updates_existing_queue_item(monkeypatch, api_client, sms_sender, sms_receiver):
    _install_fake_twilio_validator(monkeypatch, return_value=True)

    queue_item = QueueItem.objects.create(sender=sms_sender, receiver=sms_receiver, method="sms")
    SMSQueueItem.objects.create(queue_item=queue_item, body="hello", media_url=None, message_sid="abc123")

    handler_calls = []

    class HandlerSpy:
        def update_sms_qi(self, queue_item, message_status, **kwargs):
            handler_calls.append((queue_item, message_status, kwargs))

    handler_spy = HandlerSpy()
    monkeypatch.setattr("vueda.vdq.views.TwilioQueueItemHandler", lambda: handler_spy)

    delay_calls = []
    monkeypatch.setattr(
        "vueda.vdq.views.check_previously_received_message_sid",
        SimpleNamespace(delay=lambda *args: delay_calls.append(args)),
    )

    response = api_client.post(
        reverse("twilio_sms_webhook"),
        {"MessageSid": "abc123", "MessageStatus": "delivered"},
        format="multipart",
        HTTP_X_TWILIO_SIGNATURE="valid",
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert len(handler_calls) == 1
    handler_queue_item, status_arg, kwargs = handler_calls[0]
    assert isinstance(handler_queue_item, QueueItem)
    assert handler_queue_item.pk == queue_item.pk
    assert status_arg == "delivered"
    assert kwargs["webhook"] is True
    assert delay_calls == []


@pytest.mark.django_db
def test_twilio_webhook_queues_lookup_when_missing(monkeypatch, api_client):
    _install_fake_twilio_validator(monkeypatch, return_value=True)

    handler_created = False

    class FailingHandler:
        def __init__(self):
            nonlocal handler_created
            handler_created = True

        def update_sms_qi(self, *args, **kwargs):
            raise AssertionError("Handler should not be used when queue item is missing")

    monkeypatch.setattr("vueda.vdq.views.TwilioQueueItemHandler", FailingHandler)

    delay_calls = []
    monkeypatch.setattr(
        "vueda.vdq.views.check_previously_received_message_sid",
        SimpleNamespace(delay=lambda *args: delay_calls.append(args)),
    )

    response = api_client.post(
        reverse("twilio_sms_webhook"),
        {"MessageSid": "missing", "MessageStatus": "failed"},
        format="multipart",
        HTTP_X_TWILIO_SIGNATURE="valid",
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert handler_created is False
    assert delay_calls == [("missing", "failed")]


def _install_fake_twilio_validator(monkeypatch, return_value):
    calls = []

    class DummyValidator:
        def __init__(self, token):
            self.token = token

        def validate(self, uri, data, signature):
            calls.append((uri, data, signature))
            return return_value

    fake_twilio = ModuleType("twilio")
    fake_request_validator = ModuleType("twilio.request_validator")
    fake_request_validator.RequestValidator = DummyValidator
    fake_twilio.request_validator = fake_request_validator
    monkeypatch.setitem(sys.modules, "twilio", fake_twilio)
    monkeypatch.setitem(sys.modules, "twilio.request_validator", fake_request_validator)

    return calls


@pytest.mark.django_db
def test_twilio_webhook_rejects_invalid_signature(monkeypatch, api_client):
    calls = _install_fake_twilio_validator(monkeypatch, return_value=False)

    response = api_client.post(
        reverse("twilio_sms_webhook"),
        {"MessageSid": "abc123", "MessageStatus": "delivered"},
        format="multipart",
        HTTP_X_TWILIO_SIGNATURE="bad-signature",
    )

    assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
    assert calls
    uri, data, signature = calls[0]
    assert signature == "bad-signature"
    assert data["MessageSid"] == "abc123"
    assert uri.endswith("/twilio-status-callback/")


@pytest.mark.django_db
def test_twilio_webhook_fetches_twilio_message_for_error_code(monkeypatch, api_client, sms_sender, sms_receiver):
    calls = _install_fake_twilio_validator(monkeypatch, return_value=True)

    queue_item = QueueItem.objects.create(sender=sms_sender, receiver=sms_receiver, method="sms")
    SMSQueueItem.objects.create(queue_item=queue_item, body="hello", media_url=None, message_sid="sid-123")

    from vueda.vdq.handlers import TwilioQueueItemHandler

    fetched_messages = []
    update_calls = []
    handler_instance = None

    message_object = SimpleNamespace(
        error_code="30005",
        error_message="Carrier rejected the message",
        status="failed",
    )

    class DummyMessages:
        def __init__(self, sid):
            self.sid = sid

        def fetch(self):
            fetched_messages.append(self.sid)
            return message_object

    class FakeHandler:
        def __init__(self):
            self.twilio_client = SimpleNamespace(messages=lambda sid: DummyMessages(sid))

        def update_sms_qi(self, qi, message_status, *, message=None, webhook=False, error_code=""):
            update_calls.append((qi.pk, message_status, message, webhook, error_code))
            return TwilioQueueItemHandler.update_sms_qi(
                self,
                qi,
                message_status,
                message=message,
                webhook=webhook,
                error_code=error_code,
            )

    def handler_factory():
        return handler_instance

    handler_instance = FakeHandler()

    monkeypatch.setattr("vueda.vdq.views.TwilioQueueItemHandler", handler_factory)

    delay_calls = []

    class DummyTask:
        def delay(self, *args):
            delay_calls.append(args)

    monkeypatch.setattr("vueda.vdq.views.check_previously_received_message_sid", DummyTask())

    response = api_client.post(
        reverse("twilio_sms_webhook"),
        {"MessageSid": "sid-123", "MessageStatus": "failed", "ErrorCode": "30005"},
        format="multipart",
        HTTP_X_TWILIO_SIGNATURE="valid",
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
    assert calls
    assert fetched_messages == ["sid-123"]
    assert delay_calls == []
    assert update_calls == [(queue_item.pk, "failed", message_object, True, "30005")]
    queue_item.refresh_from_db()
    assert "30005 - Carrier rejected the message" in queue_item.result


@pytest.mark.django_db
def test_private_attachment_view_returns_file(settings, api_client, sender, receiver, tmp_path):
    settings.MEDIA_ROOT = tmp_path

    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    detail = AnyMailQueueItem.objects.create(queue_item=queue_item, subject="Subject", text="Body", html="")
    attachment = AnyMailQueueItemAttachment.objects.create(
        attachment=ContentFile(b"attachment-data", name="doc.txt"),
        filename="doc.txt",
        mimetype="text/plain",
        content_id_string="cid",
    )
    detail.attachments.add(attachment)

    user = get_user_model().objects.create_user(email="user@domain.invalid", password="pass", name="User")
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("private_attachment", kwargs={"pk": attachment.pk}))

    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert response["Content-Type"] == "text/plain"
    content = b"".join(response.streaming_content)
    assert content == b"attachment-data"


@pytest.mark.django_db
def test_private_attachment_view_requires_authentication(api_client):
    response = api_client.get(reverse("private_attachment", kwargs={"pk": 123}))

    assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)


@pytest.mark.django_db
def test_private_attachment_view_handles_missing_file(api_client):
    user = get_user_model().objects.create_user(email="user2@domain.invalid", password="pass", name="User 2")
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("private_attachment", kwargs={"pk": 9999}))

    assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
