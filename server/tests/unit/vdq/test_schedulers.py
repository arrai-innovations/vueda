import io

import pytest
from celery.exceptions import CeleryError
from django.core.files.base import ContentFile

from vueda.vdq import schedulers
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import QueueItem
from vueda.vdq.models import Receiver


@pytest.fixture
def receivers(db):
    return [
        Receiver.objects.create(email="to@domain.invalid", name="To", cell="+18005550102"),
        Receiver.objects.create(email="cc@domain.invalid", name="Cc", cell="+18005550103"),
        Receiver.objects.create(email="bcc@domain.invalid", name="Bcc", cell="+18005550104"),
        Receiver.objects.create(email="reply@domain.invalid", name="Reply", cell="+18005550105"),
    ]


@pytest.mark.django_db
def test_schedule_queue_item_handles_errors(monkeypatch, sender, receivers):
    qi = QueueItem.objects.create(sender=sender, receiver=receivers[0], method="email")

    class FakeTask:
        def delay_on_commit(self, pk, method):
            raise CeleryError("boom")

    monkeypatch.setattr(schedulers, "send_message", FakeTask())

    schedulers.schedule_queue_item(qi)

    qi.refresh_from_db()
    assert qi.workflow_state.code == "errored"
    assert "Failed to enqueue" in qi.result


@pytest.mark.django_db
def test_prepare_attachments_from_mapping():
    content = io.BytesIO(b"hello")
    attachments = {
        "greeting.txt": {
            "mimetype": "text/plain",
            "file": content,
            "content_id_string": "cid",
            "content_disposition_is_inline": True,
        }
    }

    prepared = schedulers._prepare_attachments(AnyMailQueueItemAttachment, attachments)

    assert len(prepared) == 1
    assert prepared[0].filename == "greeting.txt"
    assert prepared[0].content_id_string == "cid"


@pytest.mark.django_db
def test_prepare_attachments_from_sequence():
    attachment = AnyMailQueueItemAttachment.objects.create(
        filename="existing.txt",
        mimetype="text/plain",
        content_id_string="",
    )
    attachment.attachment.save("existing.txt", ContentFile(b"hello"))

    prepared = schedulers._prepare_attachments(AnyMailQueueItemAttachment, [attachment])

    assert prepared == [attachment]


@pytest.mark.django_db
def test_prepare_attachments_invalid_input():
    with pytest.raises(ValueError):
        schedulers._prepare_attachments(AnyMailQueueItemAttachment, 123)


@pytest.mark.django_db
def test_add_abstract_email_creates_queue_items(sender, receivers):
    attachments = {
        "doc.txt": {
            "mimetype": "text/plain",
            "file": io.BytesIO(b"data"),
        }
    }

    queue_items = schedulers.add_abstract_email(
        sender,
        [receivers[0]],
        "Subject",
        "Body",
        cc=[receivers[1]],
        bcc=[receivers[2]],
        reply_to=[receivers[3]],
        attachments=attachments,
    )

    assert len(queue_items) == 3  # noqa: PLR2004
    assert all(q.method == "email" for q in queue_items)
    for qi in queue_items:
        assert qi.anymail.attachments.count() == 1


@pytest.mark.django_db
def test_add_email_schedules_queue_items(monkeypatch, sender, receivers):
    captured = []
    monkeypatch.setattr(schedulers, "schedule_queue_item", lambda qi: captured.append(qi.pk))

    queue_items = schedulers.add_email(
        sender,
        [receivers[0], receivers[1]],
        "Subject",
        "Body",
    )

    assert len(queue_items) == 2  # noqa: PLR2004
    assert captured == [qi.pk for qi in queue_items]


@pytest.mark.django_db
def test_add_sms(monkeypatch, sender, receivers):
    captured = []
    monkeypatch.setattr(schedulers, "schedule_queue_item", lambda qi: captured.append(qi.pk))

    queue_items = schedulers.add_sms(sender, receivers[0], "Hello")

    assert len(queue_items) == 1
    qi = queue_items[0]
    assert qi.method == "sms"
    assert qi.sms.body == "Hello"
    assert captured == [qi.pk]
