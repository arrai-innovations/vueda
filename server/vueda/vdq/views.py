"""API views for Twilio SMS webhooks and private email attachment downloads."""

__all__ = (
    "PrivateAttachmentView",
    "TwilioSMSWebhook",
    "validate_twilio_request",
)

import logging
from functools import wraps

from django.conf import settings
from django.db import transaction
from django.http import FileResponse
from django.http import Http404
from django.http import HttpResponseForbidden
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_open_api_types
from vueda.vdq.handlers import TwilioQueueItemHandler
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.tasks import check_previously_received_message_sid


logger = logging.getLogger(__name__)


def validate_twilio_request(f):
    @wraps(f)
    def decorated_function(request, *args, **kwargs):
        from twilio.request_validator import RequestValidator

        validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)

        request_valid = validator.validate(
            request.build_absolute_uri(), request.POST, request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
        )

        if request_valid:
            return f(request, *args, **kwargs)
        else:
            return HttpResponseForbidden()

    return decorated_function


@conditional_extend_schema_decorator(responses={204: None, 403: None})
@method_decorator(validate_twilio_request, name="dispatch")
@method_decorator(csrf_exempt, name="dispatch")
class TwilioSMSWebhook(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        message_sid = request.POST.get("MessageSid")
        message_status = request.POST.get("MessageStatus")
        error_code = request.POST.get("ErrorCode", "")
        message = None
        if error_code:
            try:
                handler = TwilioQueueItemHandler()
                message = handler.twilio_client.messages(message_sid).fetch()
            except Exception:
                logger.exception("Failed to fetch Twilio message details", extra={"sid": message_sid})

        with transaction.atomic():
            try:
                qi = (
                    QueueItem.objects.select_related("sms")
                    .prefetch_related("object_states_proxy")
                    .select_for_update(of=("self",))
                    .get(sms__message_sid=message_sid)
                )
                SMSQueueItem.objects.select_for_update(of=("self",)).get(message_sid=message_sid)
            except QueueItem.DoesNotExist:
                check_previously_received_message_sid.delay(message_sid, message_status)
            else:
                handler = TwilioQueueItemHandler()
                handler.update_sms_qi(qi, message_status, message=message, webhook=True, error_code=error_code)
        return Response(status=204)


@conditional_extend_schema_decorator(responses={200: conditional_open_api_types().BINARY})
class PrivateAttachmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            attachment = AnyMailQueueItemAttachment.objects.get(pk=pk)
        except AnyMailQueueItemAttachment.DoesNotExist as exc:
            raise Http404 from exc

        return FileResponse(
            attachment.attachment.open("rb"),
            content_type=attachment.mimetype,
        )
