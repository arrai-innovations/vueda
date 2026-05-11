import pytest
from django.test import override_settings

from vueda.core.exceptions import VuedaValidationError
from vueda.user.adapters import DefaultUserAdapter
from vueda.vdq.models import Receiver
from vueda.vdq.models import Sender


@override_settings(TWILIO_CALLER_ID="")
def test_send_sms_requires_caller_id(monkeypatch):
    adapter = DefaultUserAdapter()
    monkeypatch.setattr("vueda.user.adapters.render_to_string", lambda *args, **kwargs: "body")

    with pytest.raises(VuedaValidationError) as exc_info:
        adapter.send_sms("+15551230000", "Test User", "totp_code", {"code": "123456"})
    assert [str(error) for error in exc_info.value.detail] == ["SMS sending is not configured."]


@override_settings(TWILIO_ACCOUNT_SID="TESTSID", TWILIO_AUTH_TOKEN="TESTAUTH", TWILIO_CALLER_ID="+15551239999")
def test_send_sms_requires_destination(monkeypatch):
    adapter = DefaultUserAdapter()
    monkeypatch.setattr("vueda.user.adapters.render_to_string", lambda *args, **kwargs: "body")

    with pytest.raises(VuedaValidationError) as exc_info:
        adapter.send_sms("", "Test User", "totp_code", {"code": "123456"})
    assert [str(error) for error in exc_info.value.detail] == ["Phone number is required for sms method."]


@override_settings(
    TWILIO_ACCOUNT_SID="TESTSID",
    TWILIO_AUTH_TOKEN="TESTAUTH",
    TWILIO_CALLER_ID="+15551239999",
    SITE_NAME="VUEDA",
)
@pytest.mark.django_db
def test_send_sms_sends_message(monkeypatch):
    adapter = DefaultUserAdapter()

    def fake_render_to_string(template_names, context):
        assert template_names == [
            "email/totp_code_sms_message.txt",
            "email/totp_code_message.txt",
        ]
        assert context["code"] == "123456"
        assert context["site_name"] == "VUEDA"
        return "Use code 123456"

    captured = {}

    def fake_add_sms(*, sender, receiver, body):
        captured["sender"] = sender
        captured["receiver"] = receiver
        captured["body"] = body

    monkeypatch.setattr("vueda.user.adapters.render_to_string", fake_render_to_string)
    monkeypatch.setattr("vueda.user.adapters.add_sms", fake_add_sms)

    adapter.send_sms("+15551230000", "Test User", "totp_code", {"code": "123456"})

    sender = captured["sender"]
    receiver = captured["receiver"]

    assert captured["body"] == "Use code 123456"
    assert sender.name == "SYSTEM"
    assert sender.cell == "+15551239999"
    assert receiver.name == "Test User"
    assert receiver.cell == "+15551230000"
    assert Sender.objects.filter(cell="+15551239999").count() == 1
    assert Receiver.objects.filter(cell="+15551230000").count() == 1


@override_settings(
    SITE_NAME="VUEDA",
    NO_REPLY_EMAIL="no-reply@domain.invalid",
    EMAIL_SUBJECT_PREFIX="[VUEDA] ",
)
@pytest.mark.django_db
def test_send_mail_sends_message(monkeypatch):
    adapter = DefaultUserAdapter()

    def fake_render_to_string(template_name, context):
        if isinstance(template_name, list):
            raise AssertionError("Unexpected template list for email rendering")
        if template_name.endswith("_subject.txt"):
            assert context["code"] == "123456"
            return "Daily Code"
        if template_name.endswith("_message.html"):
            return "<p>Use code 123456</p>"
        if template_name.endswith("_message.txt"):
            return "Use code 123456"
        raise AssertionError(f"Unexpected template {template_name}")

    captured = {}

    def fake_add_email(
        *,
        sender,
        to,
        subject,
        text,
        html,
        origin,
        cc,
        bcc,
        reply_to,
        attachments,
    ):
        captured.update(
            {
                "sender": sender,
                "to": to,
                "subject": subject,
                "text": text,
                "html": html,
                "origin": origin,
                "cc": cc,
                "bcc": bcc,
                "reply_to": reply_to,
                "attachments": attachments,
            }
        )

    monkeypatch.setattr("vueda.user.adapters.render_to_string", fake_render_to_string)
    monkeypatch.setattr("vueda.user.adapters.add_email", fake_add_email)

    adapter.send_mail("user@domain.invalid", "Test User", "totp_code", {"code": "123456"})

    sender = captured["sender"]
    receivers = captured["to"]

    assert sender.name == "SYSTEM"
    assert sender.email == "no-reply@domain.invalid"
    assert receivers[0].name == "Test User"
    assert receivers[0].email == "user@domain.invalid"
    assert captured["subject"] == "[VUEDA] Daily Code"
    assert captured["text"] == "Use code 123456"
    assert captured["html"] == "<p>Use code 123456</p>"
    assert captured["origin"] is None
    assert captured["cc"] is None
    assert captured["bcc"] is None
    assert captured["reply_to"] is None
    assert captured["attachments"] is None
    assert Sender.objects.filter(email="no-reply@domain.invalid").count() == 1
    assert Receiver.objects.filter(email="user@domain.invalid").count() == 1
