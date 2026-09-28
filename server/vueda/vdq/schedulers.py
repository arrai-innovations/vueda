"""Scheduling utilities for creating and queuing VDQ email and SMS queue items."""

__all__ = (
    "add_abstract_email",
    "add_email",
    "add_sms",
    "schedule_queue_item",
)

import typing
from collections.abc import Mapping
from collections.abc import Sequence
from functools import partial
from itertools import chain

from celery.exceptions import CeleryError
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.transaction import atomic
from kombu.exceptions import OperationalError

from vueda.vdq.handlers import validate_email_role
from vueda.vdq.handlers import validate_sms_role
from vueda.vdq.models import AbstractQueueItemAttachment
from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import BaseReceiver
from vueda.vdq.models import BaseSender
from vueda.vdq.models import QueueItem
from vueda.vdq.models import QueueItemOrigin
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.tasks import send_message


def schedule_queue_item(queue_item: QueueItem) -> None:
    """
    Publish the send task once the current transaction commits. A broker failure at publish time moves the
    queue item to ``errored`` with the exception in ``result``.
    """
    transaction.on_commit(partial(_publish_queue_item, queue_item))


def _publish_queue_item(queue_item: QueueItem) -> None:
    try:
        send_message.delay(queue_item.pk, queue_item.method)
    except (OperationalError, CeleryError) as e:
        with transaction.atomic():
            queue_item.fast_transition("error")
            queue_item.result = f"Failed to enqueue a Celery task for QueueItem: {e!s}"
            queue_item.save()


def _prepare_attachments(queue_item_attachment_class, attachments):
    queue_item_attachments = []
    if isinstance(attachments, Mapping):
        for file_name, attachment in attachments.items():
            content_id_string = attachment.get("content_id_string", "")
            content_disposition_is_inline = bool(attachment.get("content_disposition_is_inline"))
            qia = queue_item_attachment_class.objects.create(
                mimetype=attachment["mimetype"],
                filename=file_name,
                content_id_string=content_id_string,
                content_disposition_is_inline=bool(content_disposition_is_inline),
            )
            qia.attachment.save(file_name, ContentFile(attachment["file"].read()))
            queue_item_attachments.append(qia)
    elif isinstance(attachments, Sequence):
        for qia in attachments:
            if isinstance(qia, queue_item_attachment_class):
                queue_item_attachments.append(qia)
            else:
                raise ValueError(
                    f"attachments sequence has non-{queue_item_attachment_class.__name__}: {attachments!r}"
                )
    else:
        raise ValueError(
            f"attachments was neither a mapping of attachment mappings or a sequence of"
            f" {queue_item_attachment_class.__name__}: {attachments!r}"
        )
    return queue_item_attachments


def _setup_abstract_email_many_to_manys(method_queue_item, to, cc, reply_to, queue_item_attachments):
    if to:
        to_through_class = method_queue_item.to.through
        to_through_class.objects.bulk_create(
            [to_through_class(**{"anymail_queue_item_id": method_queue_item.pk, "receiver_id": x.pk}) for x in to]
        )
    cc_through_class = method_queue_item.cc.through
    cc_through_class.objects.bulk_create(
        [cc_through_class(**{"anymail_queue_item_id": method_queue_item.pk, "receiver_id": x.pk}) for x in cc]
    )
    reply_to_through_class = method_queue_item.reply_to.through
    reply_to_through_class.objects.bulk_create(
        [
            reply_to_through_class(**{"anymail_queue_item_id": method_queue_item.pk, "receiver_id": x.pk})
            for x in reply_to
        ]
    )
    attachments_through_class = method_queue_item.attachments.through
    attachments_through_class.objects.bulk_create(
        [
            attachments_through_class(
                **{"anymailqueueitem_id": method_queue_item.pk, "anymailqueueitemattachment_id": x.pk}
            )
            for x in queue_item_attachments
        ]
    )


@atomic
def add_abstract_email(
    sender: BaseSender,
    to: Sequence[BaseReceiver],
    subject: str,
    text: str,
    origin: QueueItemOrigin | None = None,
    html: str | None = None,
    cc: Sequence[BaseReceiver] | None = None,
    bcc: Sequence[BaseReceiver] | None = None,
    reply_to: Sequence[BaseReceiver] | None = None,
    attachments: dict[str, dict[str, typing.Any]] | Sequence[AbstractQueueItemAttachment] | None = None,
):
    validate_email_role(sender)
    queue_items = []
    if cc is None:
        cc = []
    if bcc is None:
        bcc = []
    if reply_to is None:
        reply_to = []
    for receiver in reply_to:
        # Just validate at this point - they'll be added later to each queue item
        validate_email_role(receiver)
    queue_item_attachments = []
    if attachments:
        queue_item_attachments = _prepare_attachments(AnyMailQueueItemAttachment, attachments)
    for receiver in chain(to, cc, bcc):
        validate_email_role(receiver)
        qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email", content_object=origin)
        method_queue_item = AnyMailQueueItem.objects.create(queue_item=qi, subject=subject, text=text, html=html or "")
        _setup_abstract_email_many_to_manys(method_queue_item, to, cc, reply_to, queue_item_attachments)
        queue_items.append(qi)
    return queue_items


@atomic
def add_email(
    sender: BaseSender,
    to: Sequence[BaseReceiver],
    subject: str,
    text: str,
    origin: QueueItemOrigin | None = None,
    html: str | None = None,
    cc: Sequence[BaseReceiver] | None = None,
    bcc: Sequence[BaseReceiver] | None = None,
    reply_to: Sequence[BaseReceiver] | None = None,
    attachments: dict[str, dict[str, typing.Any]] | Sequence[AnyMailQueueItemAttachment] | None = None,
):
    qis = add_abstract_email(
        sender,
        to,
        subject,
        text,
        origin=origin,
        html=html,
        cc=cc,
        bcc=bcc,
        reply_to=reply_to,
        attachments=attachments,
    )
    for qi in qis:
        schedule_queue_item(qi)

    return qis


@atomic
def add_sms(sender, receiver, body):
    validate_sms_role(sender)
    validate_sms_role(receiver)
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="sms")
    SMSQueueItem.objects.create(queue_item=qi, body=body)
    schedule_queue_item(qi)

    return [qi]
