"""URL configuration for the vueda.vdq app."""

__all__ = ("urlpatterns",)

from django.urls import include
from django.urls import path

from vueda.core.installed_apps import vdq_is_installed
from vueda.core.installed_apps import workflow_is_installed


urlpatterns = []

if vdq_is_installed() and workflow_is_installed():
    from vueda.vdq.views import PrivateAttachmentView
    from vueda.vdq.views import TwilioSMSWebhook

    urlpatterns = [
        path(
            "vueda.vdq/",
            include(
                [
                    path("", include("vueda.vdq.routers")),
                    path("anymail/", include("anymail.urls")),
                    path("twilio-status-callback/", TwilioSMSWebhook.as_view(), name="twilio_sms_webhook"),
                    path("attachments/<int:pk>/", PrivateAttachmentView.as_view(), name="private_attachment"),
                ]
            ),
        ),
    ]
