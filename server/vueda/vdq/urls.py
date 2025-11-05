from django.urls import include
from django.urls import path

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
