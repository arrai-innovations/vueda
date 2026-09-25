import os
import subprocess
import sys

import pytest
from django.core import mail

from tests.utils import set_email_backend
from vueda.core.exceptions import VuedaValidationError
from vueda.user.adapters import DefaultUserAdapter
from vueda.vdq.models import Receiver
from vueda.vdq.models import Sender


def test_send_sms_requires_caller_id(settings, monkeypatch):
    settings.TWILIO_CALLER_ID = ""

    adapter = DefaultUserAdapter()
    monkeypatch.setattr("vueda.user.adapters.render_to_string", lambda *args, **kwargs: "body")

    with pytest.raises(VuedaValidationError) as exc_info:
        adapter.send_sms("+18005550100", "Test User", "totp_code", {"code": "123456"})
    assert [str(error) for error in exc_info.value.detail] == ["SMS sending is not configured."]


def test_send_sms_requires_destination(settings, monkeypatch):
    settings.TWILIO_ACCOUNT_SID = "TESTSID"
    settings.TWILIO_AUTH_TOKEN = "TESTAUTH"
    settings.TWILIO_CALLER_ID = "+18005550100"

    adapter = DefaultUserAdapter()
    monkeypatch.setattr("vueda.user.adapters.render_to_string", lambda *args, **kwargs: "body")

    with pytest.raises(VuedaValidationError) as exc_info:
        adapter.send_sms("", "Test User", "totp_code", {"code": "123456"})
    assert [str(error) for error in exc_info.value.detail] == ["Phone number is required for sms method."]


@pytest.mark.django_db
def test_send_sms_sends_message(settings, monkeypatch):
    settings.TWILIO_ACCOUNT_SID = "TESTSID"
    settings.TWILIO_AUTH_TOKEN = "TESTAUTH"
    settings.TWILIO_CALLER_ID = "+18005550100"
    settings.SITE_NAME = "VUEDA"

    adapter = DefaultUserAdapter()

    rendered = []

    def record_render_to_string(template_names, context):
        rendered.append((template_names, context))
        return "Use code 123456"

    captured = {}

    def fake_add_sms(*, sender, receiver, body):
        captured["sender"] = sender
        captured["receiver"] = receiver
        captured["body"] = body

    monkeypatch.setattr("vueda.user.adapters.render_to_string", record_render_to_string)
    monkeypatch.setattr("vueda.vdq.schedulers.add_sms", fake_add_sms)

    adapter.send_sms("+18005550199", "Test User", "totp_code", {"code": "123456"})

    # One render, preferring the SMS template and falling back to the email text template.
    ((template_names, context),) = rendered
    assert template_names == [
        "email/totp_code_sms_message.txt",
        "email/totp_code_message.txt",
    ]
    assert context["code"] == "123456"
    assert context["site_name"] == "VUEDA"

    sender = captured["sender"]
    receiver = captured["receiver"]

    assert captured["body"] == "Use code 123456"
    assert sender.name == "SYSTEM"
    assert sender.cell == "+18005550100"
    assert receiver.name == "Test User"
    assert receiver.cell == "+18005550199"
    assert Sender.objects.filter(cell="+18005550100").count() == 1
    assert Receiver.objects.filter(cell="+18005550199").count() == 1


@pytest.mark.django_db
def test_send_mail_sends_message(settings, monkeypatch):
    settings.SITE_NAME = "VUEDA"
    settings.NO_REPLY_EMAIL = "no-reply@domain.invalid"
    settings.EMAIL_SUBJECT_PREFIX = "[VUEDA] "

    adapter = DefaultUserAdapter()

    rendered_output = {
        "email/totp_code_subject.txt": "Daily Code",
        "email/totp_code_message.html": "<p>Use code 123456</p>",
        "email/totp_code_message.txt": "Use code 123456",
    }
    rendered = []

    def record_render_to_string(template_name, context):
        rendered.append((template_name, context))
        return rendered_output.get(template_name, "")

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

    monkeypatch.setattr("vueda.user.adapters.render_to_string", record_render_to_string)
    monkeypatch.setattr("vueda.vdq.schedulers.add_email", fake_add_email)

    adapter.send_mail("user@domain.invalid", "Test User", "totp_code", {"code": "123456"})

    # Each part renders from its own template, in this order, with the caller's context.
    assert [template_name for template_name, _ in rendered] == list(rendered_output)
    assert all(context["code"] == "123456" for _, context in rendered)

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


def test_send_mail_without_vdq_sends_synchronously(settings, monkeypatch):
    settings.SITE_NAME = "VUEDA"
    settings.NO_REPLY_EMAIL = "no-reply@domain.invalid"
    settings.EMAIL_SUBJECT_PREFIX = "[VUEDA] "
    set_email_backend(settings, "django.core.mail.backends.locmem.EmailBackend")

    adapter = DefaultUserAdapter()
    monkeypatch.setattr("vueda.user.adapters.apps.is_installed", lambda app_name: False)

    adapter.send_mail("user@domain.invalid", "Test User", "totp_code", {"code": "123456"})

    assert len(mail.outbox) == 1
    email = mail.outbox[0]
    assert email.from_email == "no-reply@domain.invalid"
    assert email.to == ["user@domain.invalid"]
    assert email.subject == "[VUEDA] Automated Message: Two Factor Authentication Code"
    assert email.body == "Your VUEDA authentication code is: 123456"


def test_send_sms_without_vdq_sends_synchronously(settings, monkeypatch):
    settings.TWILIO_ACCOUNT_SID = "TESTSID"
    settings.TWILIO_AUTH_TOKEN = "TESTAUTH"
    settings.TWILIO_CALLER_ID = "+18005550100"
    settings.SITE_NAME = "VUEDA"

    adapter = DefaultUserAdapter()
    captured = {}

    class FakeMessages:
        def create(self, **kwargs):
            captured.update(kwargs)

    class FakeClient:
        messages = FakeMessages()

        def __init__(self, account_sid, auth_token):
            captured["account_sid"] = account_sid
            captured["auth_token"] = auth_token

    monkeypatch.setattr("vueda.user.adapters.apps.is_installed", lambda app_name: False)
    monkeypatch.setattr("twilio.rest.Client", FakeClient)

    adapter.send_sms("+18005550199", "Test User", "totp_code", {"code": "123456"})

    assert captured == {
        "account_sid": "TESTSID",
        "auth_token": "TESTAUTH",
        "body": "Your VUEDA authentication code is: 123456\n",
        "from_": "+18005550100",
        "to": "+18005550199",
    }


def test_django_starts_without_vdq():
    command = """
from django.conf import settings

settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "vueda.vdq"]

import django

django.setup()
"""
    env = {**os.environ, "DJANGO_SETTINGS_MODULE": "tests.settings"}

    result = subprocess.run(
        [sys.executable, "-c", command],
        capture_output=True,
        check=False,
        env=env,
        text=True,
    )

    assert result.returncode == 0, result.stderr
