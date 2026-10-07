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
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_open_api_types
from vueda.vdq.constants import TWILIO_QUEUE_ITEM_PARAM
from vueda.vdq.handlers import TwilioQueueItemHandler
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.tasks import check_previously_received_message_sid


logger = logging.getLogger(__name__)


def validate_twilio_request(f):
    """
    Wrap a view so it returns 403 unless the request carries a valid Twilio signature. The check uses
    ``TWILIO_AUTH_TOKEN`` and the ``X-Twilio-Signature`` header.
    """

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
            queue_items = (
                QueueItem.objects.select_related("sms")
                .prefetch_related("object_states_proxy")
                .select_for_update(of=("self",))
            )
            qi = queue_items.filter(sms__message_sid=message_sid).first()
            queue_item_key = _queue_item_key(request)
            if qi is None and queue_item_key is not None:
                # Twilio echoes the key that send_sms put on the callback URL. The signature check covers the URL,
                # so the key is as trustworthy as the rest of the request.
                qi = queue_items.filter(pk=queue_item_key, method="sms").first()
                if qi is not None and qi.sms.message_sid and qi.sms.message_sid != message_sid:
                    logger.warning(
                        "Twilio status callback for MessageSid %s names QueueItem %s, which stores MessageSid %s. "
                        "Ignoring it.",
                        message_sid,
                        qi.pk,
                        qi.sms.message_sid,
                    )
                    return Response(status=status.HTTP_204_NO_CONTENT)
            if qi is None:
                check_previously_received_message_sid.delay(message_sid, message_status)
            else:
                SMSQueueItem.objects.select_for_update(of=("self",)).get(queue_item=qi)
                if not qi.sms.message_sid:
                    qi.sms.message_sid = message_sid
                    qi.sms.save(update_fields=["message_sid"])
                handler = TwilioQueueItemHandler()
                handler.update_sms_qi(qi, message_status, message=message, webhook=True, error_code=error_code)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _queue_item_key(request) -> int | None:
    """Return the queue item primary key from the callback URL, or ``None`` when the URL carries none."""
    try:
        return int(request.GET[TWILIO_QUEUE_ITEM_PARAM])
    except (KeyError, TypeError, ValueError):
        return None


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
