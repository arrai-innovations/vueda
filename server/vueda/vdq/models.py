"""Django models for queue items, attachments, and messaging details in the VDQ."""

from __future__ import annotations


__all__ = (
    "SEND_METHOD_CHOICES",
    "AbstractEmailQueueItem",
    "AbstractEmailQueueItemReceiver",
    "AbstractQueueItemAttachment",
    "AnyMailQueueItem",
    "AnyMailQueueItemAttachment",
    "AnyMailQueueItemReceiverCc",
    "AnyMailQueueItemReceiverReplyTo",
    "AnyMailQueueItemReceiverTo",
    "BaseReceiver",
    "BaseSender",
    "QueueItem",
    "QueueItemOrigin",
    "Receiver",
    "SMSQueueItem",
    "Sender",
    "SentItem",
    "SentItemManager",
    "validate_mimetype",
)

import mimetypes

import django
import swapper
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError
from django.core.mail import DEFAULT_ATTACHMENT_MIME_TYPE
from django.db import models
from django.db.models import Index
from django.db.transaction import atomic
from django.utils import timezone
from phonenumber_field.modelfields import PhoneNumberField

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaModel
from vueda.vdq.celery import cancel_task
from vueda.vdq.constants import QUEUE_ITEM_DONE_STATES
from vueda.workflow.models import HasWorkflowModelMixin


class BaseSender(VuedaModel):
    email = models.EmailField(blank=True)
    name = models.CharField(max_length=255, blank=True, default="")
    cell = PhoneNumberField(null=True)

    class Meta(BaseModelMeta):
        abstract = True


class BaseReceiver(VuedaModel):
    email = models.EmailField(blank=True)
    name = models.CharField(max_length=255, blank=True, default="")
    cell = PhoneNumberField(null=True)

    class Meta(BaseModelMeta):
        abstract = True


class Sender(BaseSender):
    class Meta(BaseSender.Meta):
        swappable = swapper.swappable_setting("vueda_vdq", "Sender")


class Receiver(BaseReceiver):
    class Meta(BaseReceiver.Meta):
        swappable = swapper.swappable_setting("vueda_vdq", "Receiver")


SEND_METHOD_CHOICES = (
    ("email", "Email"),
    ("sms", "SMS"),
)


class QueueItem(VuedaModel, HasWorkflowModelMixin):
    sender = models.ForeignKey(
        swapper.get_model_name("vueda_vdq", "Sender"),
        on_delete=models.PROTECT,
    )
    receiver = models.ForeignKey(
        swapper.get_model_name("vueda_vdq", "Receiver"),
        on_delete=models.PROTECT,
    )
    content_type = models.ForeignKey(ContentType, null=True, on_delete=models.CASCADE)
    object_id = models.PositiveSmallIntegerField(null=True)
    content_object = GenericForeignKey("content_type", "object_id")
    method = models.CharField(max_length=255, choices=SEND_METHOD_CHOICES)
    result = models.TextField(default="")
    retry_delay = models.IntegerField(default=0, help_text="seconds")

    queued = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    done_since = models.DateTimeField(default=timezone.now)
    task_id = models.CharField(max_length=255, default="", blank=True)
    formatted_name = None

    class Meta(BaseModelMeta):
        default_related_name = "queue_items"
        ordering = ("-queued", "-last_updated")

        permissions = [
            ("can_resend", "Can resend the item"),
            ("can_cancel", "Can cancel the item"),
            ("can_retry", "Can retry the item"),
        ]

    def __str__(self):
        return "Item Details"

    def get_formatted_name(self):
        return f"Queue Item #{self.pk}"

    @atomic
    def delete_files(self):
        if self.method == "email":
            self.delete_email_attachments()

    def delete_email_attachments(self):
        for attachment in self.anymail.attachments.all():
            if attachment.attachment:
                for mqi in attachment.anymail_queue_items.all():
                    if mqi.queue_item.workflow_state.code not in QUEUE_ITEM_DONE_STATES:
                        break
                else:
                    attachment.attachment.delete(save=True)

    def on_transition(self, transition, user=None, dry_run=False):
        if transition.code in ("retry", "cancel") and self.task_id:
            cancel_task(self.task_id)
            self.task_id = ""
            self.retry_delay = 0
            self.save(update_fields=["task_id", "retry_delay"])
        if transition.code == "retry":
            from vueda.vdq.schedulers import schedule_queue_item

            self.result = ""
            self.save(update_fields=["result"])
            schedule_queue_item(self)

        elif not dry_run and self.workflow_state.code in QUEUE_ITEM_DONE_STATES:
            max_age = getattr(settings, "VDQ_MAX_FILES_AGE_IN_SECONDS", None)
            if max_age == 0:
                self.delete_files()


def validate_mimetype(value: str):
    if not value or "/" not in value:
        raise ValidationError("Mimetype must be in the format 'type/subtype'.")
    main, _, sub = value.partition("/")
    if not main or not sub:
        raise ValidationError("Mimetype must have both a main type and a subtype.")


class AbstractQueueItemAttachment(models.Model):
    attachment = models.FileField(
        upload_to="email_queue_item_attachments",
    )
    filename = models.CharField(
        max_length=255,
    )
    mimetype = models.CharField(
        max_length=100,
        validators=[validate_mimetype],
    )
    file_size = models.PositiveIntegerField(
        null=True,
    )
    content_disposition_is_inline = models.BooleanField(default=False)
    content_id_string = models.CharField(
        max_length=100,
    )

    class Meta:
        abstract = True

    if django.VERSION >= (6, 0):

        def save(self, **kwargs):
            if self.attachment:
                if not self.file_size:
                    try:
                        self.file_size = self.attachment.size
                    except (OSError, AttributeError):
                        # Some storages cannot provide size yet; skip and persist without it.
                        pass
                if not self.mimetype:
                    detected_type, _ = mimetypes.guess_type(self.filename)
                    self.mimetype = detected_type or DEFAULT_ATTACHMENT_MIME_TYPE

            super().save(**kwargs)

    else:

        def save(self, *args, **kwargs):
            if self.attachment:
                if not self.file_size:
                    try:
                        self.file_size = self.attachment.size
                    except (OSError, AttributeError):
                        # Some storages cannot provide size yet; skip and persist without it.
                        pass
                if not self.mimetype:
                    detected_type, _ = mimetypes.guess_type(self.filename)
                    self.mimetype = detected_type or DEFAULT_ATTACHMENT_MIME_TYPE

            super().save(*args, **kwargs)

    def get_content(self):
        with self.attachment.open("rb") as f:
            return f.read()

    @property
    def main_type(self):
        return self.mimetype.split("/")[0] if self.mimetype else None

    @property
    def sub_type(self):
        return self.mimetype.split("/")[1] if self.mimetype and "/" in self.mimetype else None


class AnyMailQueueItemAttachment(AbstractQueueItemAttachment):
    anymail_queue_items = models.ManyToManyField("vueda_vdq.AnyMailQueueItem", related_name="attachments")

    class Meta(AbstractQueueItemAttachment.Meta):
        default_related_name = "anymail_attachments"

    def __str__(self):
        return self.filename


class AbstractEmailQueueItemReceiver(models.Model):
    receiver = models.ForeignKey(swapper.get_model_name("vueda_vdq", "Receiver"), on_delete=models.CASCADE)

    class Meta:
        abstract = True


class AnyMailQueueItemReceiverTo(AbstractEmailQueueItemReceiver):
    anymail_queue_item = models.ForeignKey("vueda_vdq.AnyMailQueueItem", on_delete=models.CASCADE)

    class Meta(AbstractEmailQueueItemReceiver.Meta):
        default_related_name = "anymail_queue_item_receiver_tos"

    def __str__(self):
        return f"{self.receiver.name} <{self.receiver.email}>"


class AnyMailQueueItemReceiverCc(AbstractEmailQueueItemReceiver):
    anymail_queue_item = models.ForeignKey("vueda_vdq.AnyMailQueueItem", on_delete=models.CASCADE)

    class Meta(AbstractEmailQueueItemReceiver.Meta):
        default_related_name = "anymail_queue_item_receiver_ccs"

    def __str__(self):
        return f"{self.receiver.name} <{self.receiver.email}>"


class AnyMailQueueItemReceiverReplyTo(AbstractEmailQueueItemReceiver):
    anymail_queue_item = models.ForeignKey("vueda_vdq.AnyMailQueueItem", on_delete=models.CASCADE)

    class Meta(AbstractEmailQueueItemReceiver.Meta):
        default_related_name = "anymail_queue_item_receiver_reply_tos"

    def __str__(self):
        return f"{self.receiver.name} <{self.receiver.email}>"


class AbstractEmailQueueItem(models.Model):
    subject = models.TextField()
    text = models.TextField()
    html = models.TextField(blank=True, default="")

    class Meta:
        abstract = True


class AnyMailQueueItem(AbstractEmailQueueItem):
    queue_item = models.OneToOneField(QueueItem, related_name="anymail", on_delete=models.CASCADE)
    to = models.ManyToManyField(
        swapper.get_model_name("vueda_vdq", "Receiver"),
        related_name="anymail_queue_items_to",
        through=AnyMailQueueItemReceiverTo,
        through_fields=("anymail_queue_item", "receiver"),
    )
    cc = models.ManyToManyField(
        swapper.get_model_name("vueda_vdq", "Receiver"),
        related_name="anymail_queue_items_cc",
        through=AnyMailQueueItemReceiverCc,
        through_fields=("anymail_queue_item", "receiver"),
    )
    reply_to = models.ManyToManyField(
        swapper.get_model_name("vueda_vdq", "Receiver"),
        related_name="anymail_queue_items_reply_to",
        through=AnyMailQueueItemReceiverReplyTo,
        through_fields=("anymail_queue_item", "receiver"),
    )
    message_id = models.CharField(max_length=255, default="", blank=True)

    class Meta(AbstractEmailQueueItem.Meta):
        default_related_name = "anymail_queue_items"

    def __str__(self):
        return f"Anymail detail for QueueItem {self.queue_item.pk}"

    def clone(self, new_queue_item: QueueItem):
        new_mailgun_queue_item = AnyMailQueueItem(
            subject=self.subject,
            text=self.text,
            html=self.html,
            queue_item=new_queue_item,
        )
        new_mailgun_queue_item.save()

        for to_receiver in self.to.all():
            new_to_receiver = AnyMailQueueItemReceiverTo(
                receiver=to_receiver, anymail_queue_item=new_mailgun_queue_item
            )
            new_to_receiver.save()

        for cc_receiver in self.cc.all():
            new_cc_receiver = AnyMailQueueItemReceiverCc(
                receiver=cc_receiver, anymail_queue_item=new_mailgun_queue_item
            )
            new_cc_receiver.save()

        for reply_to_receiver in self.reply_to.all():
            new_reply_to_receiver = AnyMailQueueItemReceiverReplyTo(
                receiver=reply_to_receiver, anymail_queue_item=new_mailgun_queue_item
            )
            new_reply_to_receiver.save()

        for attachment in self.attachments.all():
            attachment.anymail_queue_items.add(new_mailgun_queue_item)


class SMSQueueItem(models.Model):
    queue_item = models.OneToOneField(QueueItem, related_name="sms", on_delete=models.CASCADE)
    body = models.TextField(max_length=1600)
    # this should be an array of string urls
    # see https://www.twilio.com/docs/api/rest/sending-messages#post
    # & https://www.twilio.com/docs/api/rest/accepted-mime-types
    media_url = models.JSONField(null=True)
    message_sid = models.CharField(max_length=34)

    class Meta:
        default_related_name = "sms_queue_items"
        indexes = (Index(fields=["message_sid"]),)

    def __str__(self):
        return f"SMS detail for QueueItem {self.queue_item.pk}"


class QueueItemOrigin(models.Model):
    queue_item = GenericRelation(QueueItem)

    class Meta:
        abstract = True


class SentItemManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(object_states_proxy__state__code__in=QUEUE_ITEM_DONE_STATES)


class SentItem(QueueItem):
    objects = SentItemManager()

    class Meta(BaseModelMeta):
        proxy = True
        verbose_name = "Sent Item"

    def get_formatted_name(self):
        return f"Sent Item #{self.pk}"

    def clone(self) -> QueueItem:
        new_queue_item = QueueItem(
            method=self.method,
            receiver=self.receiver,
            sender=self.sender,
        )
        new_queue_item.save()

        try:
            anymail = self.anymail
        except ObjectDoesNotExist:
            pass
        else:
            anymail.clone(new_queue_item)

        try:
            sms = self.sms
        except ObjectDoesNotExist:
            pass
        else:
            new_sms_queue_item = SMSQueueItem(body=sms.body, media_url=sms.media_url, queue_item=new_queue_item)
            new_sms_queue_item.save()

        return new_queue_item
