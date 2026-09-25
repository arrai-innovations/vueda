from pathlib import Path
from types import MethodType
from types import SimpleNamespace

import pytest
from django.core.files.base import ContentFile

from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import AnyMailQueueItemAttachment
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.utils import lock_queue_item
from vueda.workflow.models import Transition


@pytest.mark.django_db
def test_lock_queue_item_returns_locked_instance(sender, receiver):
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")

    with lock_queue_item(qi.pk) as locked:
        assert locked is not None
        assert locked.pk == qi.pk
        locked.fast_transition("send")

    qi.refresh_from_db()
    assert qi.workflow_state.code == "sending"


@pytest.mark.django_db
def test_allow_transition(sender, receiver):
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    send_transition = Transition.objects.get(workflow=qi.workflow, code="send")
    await_transition = Transition.objects.get(workflow=qi.workflow, code="await")

    # queued -> send is a legal source, queued -> await is not.
    assert qi.allow_transition(send_transition)
    assert not qi.allow_transition(await_transition)

    qi.fast_transition("send")
    qi.fast_transition("delay")
    cancel_transition = Transition.objects.get(workflow=qi.workflow, code="cancel")

    assert qi.allow_transition(cancel_transition)
    assert not qi.allow_transition(await_transition)


@pytest.mark.django_db
def test_allow_transition_rejects_ignored_source(sender, receiver):
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    qi.fast_transition("cancel")
    error_transition = Transition.objects.get(workflow=qi.workflow, code="error")

    # cancelled -> error exists as a TransitionSource but is marked ignored.
    assert qi.workflow_state.code == "cancelled"
    assert qi.should_ignore_transition_from_state(error_transition)
    assert not qi.allow_transition(error_transition)


@pytest.mark.django_db
def test_allow_transition_not_gated_by_workflow_code(sender, receiver):
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    send_transition = Transition.objects.get(workflow=qi.workflow, code="send")

    qi.workflow.code = "delayed"

    assert qi.allow_transition(send_transition)


@pytest.mark.django_db
def test_delete_files_only_calls_email_cleanup(monkeypatch, sender, receiver, sms_sender, sms_receiver):
    email_queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    sms_queue_item = QueueItem.objects.create(sender=sms_sender, receiver=sms_receiver, method="sms")

    email_calls = []
    sms_calls = []

    def record_email_cleanup(self):
        email_calls.append(True)

    def record_sms_cleanup(self):
        sms_calls.append(True)

    monkeypatch.setattr(
        email_queue_item,
        "delete_email_attachments",
        MethodType(record_email_cleanup, email_queue_item),
    )
    monkeypatch.setattr(
        sms_queue_item,
        "delete_email_attachments",
        MethodType(record_sms_cleanup, sms_queue_item),
    )

    email_queue_item.delete_files()
    sms_queue_item.delete_files()

    assert email_calls == [True]
    assert sms_calls == []


@pytest.mark.django_db
def test_delete_email_attachments_deletes_when_all_queue_items_done(
    settings, tmp_path, sender, receiver, other_receiver
):
    settings.MEDIA_ROOT = tmp_path

    queue_item_one = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    queue_item_two = QueueItem.objects.create(sender=sender, receiver=other_receiver, method="email")

    detail_one = AnyMailQueueItem.objects.create(queue_item=queue_item_one, subject="Subj", text="Body", html="")
    detail_two = AnyMailQueueItem.objects.create(queue_item=queue_item_two, subject="Subj", text="Body", html="")

    attachment = AnyMailQueueItemAttachment.objects.create(
        filename="attachment.txt",
        mimetype="text/plain",
        content_id_string="cid",
    )
    attachment.attachment.save("attachment.txt", ContentFile(b"payload"))
    detail_one.attachments.add(attachment)
    detail_two.attachments.add(attachment)

    file_path = Path(attachment.attachment.path)
    assert file_path.exists()

    queue_item_one.fast_transition("send")
    queue_item_one.fast_transition("await")
    queue_item_one.fast_transition("succeed")
    queue_item_one.delete_email_attachments()
    assert file_path.exists()

    queue_item_two.fast_transition("send")
    queue_item_two.fast_transition("await")
    queue_item_two.fast_transition("succeed")
    queue_item_two.delete_email_attachments()

    attachment.refresh_from_db()
    assert not file_path.exists()
    assert attachment.attachment.name == ""


@pytest.mark.django_db
def test_queue_item_on_transition_retry_resets_task(monkeypatch, sender, receiver):
    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="sms")
    queue_item.task_id = "task-123"
    queue_item.retry_delay = 300
    queue_item.result = "error"
    queue_item.save(update_fields=["task_id", "retry_delay", "result"])

    cancel_calls = []

    def fake_cancel(task_id):
        cancel_calls.append(task_id)

    monkeypatch.setattr("vueda.vdq.models.cancel_task", fake_cancel)

    scheduled = []

    def fake_schedule(qi):
        scheduled.append(qi.pk)

    monkeypatch.setattr("vueda.vdq.schedulers.schedule_queue_item", fake_schedule)

    queue_item.on_transition(SimpleNamespace(code="retry"))
    queue_item.refresh_from_db()

    assert cancel_calls == ["task-123"]
    assert scheduled == [queue_item.pk]
    assert queue_item.task_id == ""
    assert queue_item.retry_delay == 0
    assert queue_item.result == ""


@pytest.mark.django_db
def test_queue_item_on_transition_done_triggers_file_cleanup(settings, monkeypatch, sender, receiver, email_queue_item):
    settings.VDQ_MAX_FILES_AGE_IN_SECONDS = 0

    email_queue_item.fast_transition("send")
    email_queue_item.fast_transition("await")
    email_queue_item.fast_transition("succeed")

    delete_calls = []

    def record_delete():
        delete_calls.append(True)

    email_queue_item.delete_files = lambda: record_delete()

    email_queue_item.on_transition(SimpleNamespace(code="succeed"))

    assert delete_calls == [True]


@pytest.mark.django_db
def test_queue_item_on_transition_dry_run_skips_file_cleanup(settings, monkeypatch, sender, receiver, email_queue_item):
    settings.VDQ_MAX_FILES_AGE_IN_SECONDS = 0

    email_queue_item.fast_transition("send")
    email_queue_item.fast_transition("await")
    email_queue_item.fast_transition("succeed")

    delete_calls = []

    def record_delete():
        delete_calls.append(True)

    email_queue_item.delete_files = record_delete

    email_queue_item.on_transition(SimpleNamespace(code="succeed"), dry_run=True)

    assert delete_calls == []


@pytest.mark.django_db
def test_anymail_attachment_save_populates_metadata(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path

    attachment = AnyMailQueueItemAttachment(
        filename="report.pdf",
        mimetype="",
        content_id_string="cid",
    )
    attachment.attachment.save("report.pdf", ContentFile(b"binary-data"))
    attachment.save()

    assert attachment.file_size == len(b"binary-data")
    assert attachment.mimetype == "application/pdf"


@pytest.mark.django_db
def test_anymail_clone_copies_relationships(sender, receiver, other_receiver):
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    detail = AnyMailQueueItem.objects.create(queue_item=qi, subject="Subj", text="Body", html="<p>Body</p>")
    attachment = AnyMailQueueItemAttachment.objects.create(
        filename="test.txt",
        mimetype="text/plain",
        content_id_string="",  # required field
    )
    attachment.attachment.save("test.txt", ContentFile(b"hello"))
    detail.attachments.add(attachment)
    detail.to.add(receiver)
    detail.cc.add(other_receiver)
    detail.reply_to.add(other_receiver)

    new_qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")

    detail.clone(new_qi)

    cloned_detail = new_qi.anymail
    assert cloned_detail.subject == "Subj"
    assert cloned_detail.text == "Body"
    assert cloned_detail.html == "<p>Body</p>"
    assert cloned_detail.attachments.count() == 1
    assert cloned_detail.to.count() == 1
    assert cloned_detail.cc.count() == 1
    assert cloned_detail.reply_to.count() == 1


@pytest.mark.django_db
def test_sent_item_clone_creates_new_queue_item(sender, receiver):
    qi = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    detail = AnyMailQueueItem.objects.create(queue_item=qi, subject="Subj", text="Body", html="")
    attachment = AnyMailQueueItemAttachment.objects.create(
        filename="doc.txt",
        mimetype="text/plain",
        content_id_string="",
    )
    attachment.attachment.save("doc.txt", ContentFile(b"hello"))
    detail.attachments.add(attachment)
    SMSQueueItem.objects.create(queue_item=qi, body="hello", media_url=["http://domain.invalid"], message_sid="sid")

    qi.fast_transition("send")
    qi.fast_transition("await")
    qi.fast_transition("succeed")

    sent_item = SentItem.objects.get(pk=qi.pk)

    new_qi = sent_item.clone()

    assert new_qi.pk != qi.pk
    assert new_qi.sender == qi.sender
    assert new_qi.receiver == qi.receiver
    assert new_qi.method == qi.method
    assert new_qi.anymail.subject == detail.subject
    assert new_qi.anymail.attachments.count() == 1
    assert new_qi.sms.body == qi.sms.body
    assert new_qi.workflow_state.code == "queued"
