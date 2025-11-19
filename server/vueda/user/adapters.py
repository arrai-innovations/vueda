from allauth.account.adapter import DefaultAccountAdapter
from allauth.headless.adapter import DefaultHeadlessAdapter
from allauth.mfa.adapter import DefaultMFAAdapter
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.template import TemplateDoesNotExist
from django.template.loader import render_to_string
from django.utils.encoding import force_str
from django.utils.module_loading import import_string
from rest_framework.settings import api_settings

from vueda.core.exceptions import VuedaValidationError
from vueda.user.utils import is_twilio_configured
from vueda.vdq.models import Receiver
from vueda.vdq.models import Sender
from vueda.vdq.schedulers import add_email
from vueda.vdq.schedulers import add_sms


class VuedaAllAuthHeadlessAdapter(DefaultHeadlessAdapter):
    """
    Adapter for Vueda AllAuth integration.
    """

    def user_as_dataclass(self, user):
        UserDc = self.get_user_dataclass()  # noqa: N806
        kwargs = {}
        User = get_user_model()  # noqa: N806
        pk_field_class = type(User._meta.pk)
        if not user.pk:
            id_dc = None
        elif issubclass(pk_field_class, models.IntegerField):
            id_dc = user.pk
        else:
            id_dc = str(user.pk)

        kwargs.update(
            {
                "id": id_dc,
                "email": user.email,
                "display": user.name,
                "has_usable_password": user.has_usable_password(),
            }
        )
        return UserDc(**kwargs)


class VuedaAllAuthAccountAdapter(DefaultAccountAdapter):
    def validation_error(self, code, *args):
        message = self.error_messages[code]
        if args:
            message = message % args
        raise VuedaValidationError({api_settings.NON_FIELD_ERRORS_KEY: [message]})


class VuedaAllAuthMFAAdapter(DefaultMFAAdapter):
    def validation_error(self, code, *args):
        message = self.error_messages[code]
        if args:
            message = message % args
        raise VuedaValidationError({api_settings.NON_FIELD_ERRORS_KEY: [message]})


class DefaultUserAdapter:
    template_prefix_mapping = {
        "forgot_password": "email/forgot_password",
        "totp_code": "email/totp_code",
        "welcome_user": "email/welcome_user",
    }

    def render_mail(
        self,
        template_prefix,
        context,
    ):
        subject = render_to_string(f"{template_prefix}_subject.txt", context)
        subject = " ".join(subject.splitlines()).strip()
        subject = self.format_email_subject(subject)

        bodies = {}
        msg = {
            "body": "",
            "html": "",
            "subject": subject,
        }
        for ext in ["html", "txt"]:
            try:
                template_name = f"{template_prefix}_message.{ext}"
                bodies[ext] = render_to_string(
                    template_name,
                    context,
                ).strip()
            except TemplateDoesNotExist:
                if ext == "txt" and not bodies:
                    # We need at least one body
                    raise
        if "txt" in bodies:
            msg["body"] = bodies["txt"]
            if "html" in bodies:
                msg["html"] = bodies["html"]
        else:
            msg["html"] = bodies["html"]
            msg["body"] = bodies["html"]
        return msg

    def format_email_subject(self, subject) -> str:
        prefix = settings.EMAIL_SUBJECT_PREFIX
        if prefix is None:
            prefix = f"[{settings.SITE_NAME}] "
        return prefix + force_str(subject)

    def send_mail(
        self,
        to_email,
        to_name,
        code,
        context,
        origin=None,
        cc=None,
        bcc=None,
        reply_to=None,
        attachments=None,
        template_prefix=None,
    ) -> None:
        ctx = {
            "email": to_email,
            "site_name": settings.SITE_NAME,
        }
        ctx.update(context)
        sender = Sender.objects.get_or_create(name="SYSTEM", email=settings.NO_REPLY_EMAIL)[0]
        to = Receiver.objects.get_or_create(name=to_name, email=to_email)[0]
        if not template_prefix:
            template_prefix = self.template_prefix_mapping[code]
        msg = self.render_mail(template_prefix, ctx)

        add_email(
            sender=sender,
            to=[to],
            subject=msg["subject"],
            text=msg["body"],
            html=msg["html"],
            origin=origin,
            cc=cc,
            bcc=bcc,
            reply_to=reply_to,
            attachments=attachments,
        )

    def send_sms(self, to_number, to_name, code, context) -> None:
        template_prefix = self.template_prefix_mapping[code]
        template_names = [
            f"{template_prefix}_sms_message.txt",
            f"{template_prefix}_message.txt",
        ]
        ctx = {
            "site_name": settings.SITE_NAME,
        }
        ctx.update(context)
        body = render_to_string(template_names, ctx)
        if not is_twilio_configured():
            raise VuedaValidationError("SMS sending is not configured.")
        if not to_number:
            raise VuedaValidationError("Phone number is required for sms method.")

        sender = Sender.objects.get_or_create(name="SYSTEM", cell=settings.TWILIO_CALLER_ID)[0]
        to = Receiver.objects.get_or_create(name=to_name, cell=to_number)[0]

        add_sms(
            sender=sender,
            receiver=to,
            body=body,
        )


def get_adapter() -> DefaultUserAdapter:
    adapter_class_path = settings.VUEDA_USER_ADAPTER
    adapter_class = import_string(adapter_class_path)
    return adapter_class()
