"""Serializers for VDQ queue items, sent items, and related email and SMS details."""

__all__ = (
    "AnyMailQueueItemAttachmentSerializer",
    "AnyMailQueueItemSerializer",
    "DefaultQueueItemSerializer",
    "DefaultSentItemSerializer",
    "QueueItemSerializer",
    "ReceiverSerializer",
    "SMSQueueItemSerializer",
    "SenderSerializer",
    "SentItemSerializer",
)

import swapper
from django.conf import settings
from rest_framework import serializers

from vueda.core.serializers import VuedaSerializer
from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.vdq.models import SMSQueueItem
from vueda.workflow.serializers import HasWorkflowSerializerMixin


class AnyMailQueueItemSerializer(serializers.ModelSerializer):
    anymail_attachments = serializers.SerializerMethodField()

    class Meta:
        model = AnyMailQueueItem
        fields = [
            "queue_item",
            "subject",
            "text",
            "html",
            "message_id",
            "anymail_attachments",
        ]
        read_only_fields = fields

    def get_anymail_attachments(self, obj):
        qs = obj.attachments.all()
        return AnyMailQueueItemAttachmentSerializer(qs, many=True, context=self.context).data


class AnyMailQueueItemAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = AnyMailQueueItemAttachment
        fields = [
            "filename",
            "url",
        ]
        read_only_fields = fields

    def get_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(f"{settings.VDQ_URL}/attachments/{obj.pk}/")


class SMSQueueItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMSQueueItem
        fields = [
            "id",
            "body",
        ]
        read_only_fields = fields


class SenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = swapper.load_model("vueda_vdq", "Sender")
        fields = ["id", "email", "name", "cell"]
        read_only_fields = fields


class ReceiverSerializer(serializers.ModelSerializer):
    class Meta:
        model = swapper.load_model("vueda_vdq", "Receiver")
        fields = ["id", "email", "name", "cell"]
        read_only_fields = fields


class DefaultQueueItemSerializer(HasWorkflowSerializerMixin, VuedaSerializer):
    formatted_name = serializers.SerializerMethodField()

    class Meta(VuedaSerializer.Meta):
        model = QueueItem
        fields = (
            [
                "id",
                "sender",
                "receiver",
                "method",
                "result",
                "queued",
                "last_updated",
                "done_since",
                "anymail",
                "sms",
                "retry_delay",
                "formatted_name",
            ]
            + VuedaSerializer.Meta.fields
            + HasWorkflowSerializerMixin.Meta.fields
        )
        read_only_fields = fields

        expandable_fields = {
            "anymail": (AnyMailQueueItemSerializer, {}),
            "sender": (SenderSerializer, {}),
            "receiver": (ReceiverSerializer, {}),
            "sms": (SMSQueueItemSerializer, {}),
        }

    def get_attachments(self, obj):
        if not hasattr(obj, "anymail"):
            return []
        qs = AnyMailQueueItemAttachment.objects.filter(anymail_queue_items=obj.anymail)
        return AnyMailQueueItemAttachmentSerializer(qs, many=True, context=self.context).data

    def get_formatted_name(self, obj):
        return obj.get_formatted_name() or None


QueueItemSerializer = getattr(settings, "QUEUE_ITEM_SERIALIZER", DefaultQueueItemSerializer)


class DefaultSentItemSerializer(QueueItemSerializer):
    formatted_name = serializers.SerializerMethodField()

    class Meta(VuedaSerializer.Meta):
        model = SentItem
        fields = (
            [
                "id",
                "sender",
                "receiver",
                "method",
                "result",
                "queued",
                "last_updated",
                "done_since",
                "anymail",
                "sms",
                "formatted_name",
            ]
            + VuedaSerializer.Meta.fields
            + HasWorkflowSerializerMixin.Meta.fields
        )
        read_only_fields = fields

        expandable_fields = {
            "anymail": (AnyMailQueueItemSerializer, {}),
            "sender": (SenderSerializer, {}),
            "receiver": (ReceiverSerializer, {}),
            "sms": (SMSQueueItemSerializer, {}),
        }

    def get_formatted_name(self, obj):
        return obj.get_formatted_name() or None


SentItemSerializer = getattr(settings, "SENT_ITEM_SERIALIZER", DefaultSentItemSerializer)
