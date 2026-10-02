import sys
from datetime import timedelta
from types import SimpleNamespace

import pghistory
import pytest
from celery.exceptions import Ignore
from django.utils import timezone

from vueda.vdq.celery import setup_periodic_tasks
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.tasks import QueueProcessor
from vueda.vdq.tasks import check_previously_received_message_sid
from vueda.vdq.tasks import check_sms_status
from vueda.vdq.tasks import send_message
from vueda.workflow.exceptions import InvalidTransitionError


@pytest.mark.django_db
def test_send_message_missing_queue_item(monkeypatch):
    def fake_lock(pk, operation):
        assert pk == 99999  # noqa: PLR2004
        return operation(None)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    with pytest.raises(Ignore):
        send_message(99999, "email")


@pytest.mark.django_db
def test_a_task_runs_inside_a_task_action(monkeypatch):
    """Every write a task makes carries the task's name and the ``task`` kind."""
    seen = {}

    def fake_lock(pk, operation):
        with pghistory.context() as active:
            seen.update(active.metadata)
        return operation(None)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    with pytest.raises(Ignore):
        send_message(99999, "email")

    assert seen["action"] == send_message.name
    assert seen["kind"] == "task"


@pytest.mark.django_db
def test_check_sms_status_uses_oldest_timestamp(monkeypatch, sms_queue_item, sender, receiver):
    sms_queue_item.fast_transition("send")
    sms_queue_item.fast_transition("await")

    newer = QueueItem.objects.create(sender=sender, receiver=receiver, method="sms")
    SMSQueueItem.objects.create(queue_item=newer, body="new", media_url=[], message_sid="NEWER")
    newer.fast_transition("send")
    newer.fast_transition("await")

    older_time = timezone.now() - timedelta(hours=1)
    newer_time = timezone.now()
    QueueItem.objects.filter(pk=sms_queue_item.pk).update(queued=older_time)
    QueueItem.objects.filter(pk=newer.pk).update(queued=newer_time)
    expected_oldest = QueueItem.objects.get(pk=sms_queue_item.pk).queued

    called_with: list = []

    def record_pull(self, minimum):
        called_with.append(minimum)

    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler.pull_sms_status", record_pull)

    check_sms_status()

    assert called_with == [expected_oldest]


@pytest.mark.django_db
def test_check_previously_received_message_sid_updates_queue_item(monkeypatch, sms_queue_item):
    sms_queue_item.fast_transition("send")
    sms_queue_item.fast_transition("await")

    manager = SMSQueueItem.objects

    def passthrough_select_for_update(*args, **kwargs):
        return manager

    monkeypatch.setattr(manager, "select_for_update", passthrough_select_for_update)

    calls: list[tuple[int, str, bool]] = []

    def record_update(self, qi, message_status, webhook):
        calls.append((qi.pk, message_status, webhook))

    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler.update_sms_qi", record_update)

    check_previously_received_message_sid("SID", "delivered")

    assert calls == [(sms_queue_item.pk, "delivered", True)]


@pytest.mark.django_db
def test_check_previously_received_message_sid_retries_until_the_sid_is_stored(monkeypatch):
    calls = []
    monkeypatch.setattr(
        "vueda.vdq.tasks.TwilioQueueItemHandler.update_sms_qi", lambda self, *args, **kwargs: calls.append(args)
    )

    # Called directly, Celery re-raises the exception that a worker would retry on.
    with pytest.raises(QueueItem.DoesNotExist):
        check_previously_received_message_sid("UNSTORED", "delivered")

    assert QueueItem.DoesNotExist in check_previously_received_message_sid.autoretry_for
    assert calls == []


@pytest.mark.django_db
def test_queue_processor_on_retry_updates_queue_item(monkeypatch):
    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler", SimpleNamespace)

    saved = []
    transitions = []

    class DummyQueueItem:
        def __init__(self):
            self.task_id = ""
            self.retry_delay = 0
            self.workflow_state = SimpleNamespace(code="sending")

        def save(self, update_fields):
            saved.append(update_fields)

        def fast_transition(self, code):
            transitions.append(code)

    qi = DummyQueueItem()

    def fake_lock(pk, operation):
        assert pk == 1
        return operation(qi)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    cancel_calls = []
    monkeypatch.setattr("vueda.vdq.celery.app.control.revoke", lambda task_id, **kwargs: cancel_calls.append(task_id))
    delay = 30
    einfo = SimpleNamespace(exception=SimpleNamespace(exc=SimpleNamespace(when=delay)))

    task = QueueProcessor()
    task.on_retry(RuntimeError("boom"), "task-1", (1,), {}, einfo)

    assert qi.task_id == "task-1"
    assert qi.retry_delay == delay
    assert saved == [["task_id", "retry_delay"]]
    assert transitions == ["delay"]
    assert cancel_calls == []


@pytest.mark.django_db
def test_queue_processor_on_retry_without_when(monkeypatch):
    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler", SimpleNamespace)

    transitions = []

    class DummyQueueItem:
        def __init__(self):
            self.task_id = ""
            self.retry_delay = 0
            self.workflow_state = SimpleNamespace(code="sending")

        def save(self, update_fields):
            pass

        def fast_transition(self, code):
            transitions.append(code)

    qi = DummyQueueItem()

    def fake_lock(pk, operation):
        return operation(qi)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    einfo = SimpleNamespace(exception=SimpleNamespace())

    task = QueueProcessor()
    task.on_retry(RuntimeError("boom"), "task-2", (2,), {}, einfo)

    assert qi.task_id == "task-2"
    assert qi.retry_delay == 0
    assert transitions == ["delay"]


@pytest.mark.django_db
def test_queue_processor_on_retry_from_queued_records_the_task_without_delaying(monkeypatch, email_queue_item):
    monkeypatch.setattr(
        "vueda.vdq.celery.app.control.revoke", lambda task_id, **kwargs: pytest.fail("revoke should not be called")
    )

    task = QueueProcessor()
    task.on_retry(RuntimeError("locked"), "task-q", (email_queue_item.pk,), {}, SimpleNamespace(exception=None))

    email_queue_item.refresh_from_db()
    assert email_queue_item.task_id == "task-q"
    assert email_queue_item.workflow_state.code == "queued"


@pytest.mark.django_db
def test_queue_processor_on_retry_ignores_missing_queue_item(monkeypatch):
    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler", SimpleNamespace)

    def fake_lock(pk, operation):
        return operation(None)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    cancel_calls = []
    monkeypatch.setattr("vueda.vdq.celery.app.control.revoke", lambda task_id, **kwargs: cancel_calls.append(task_id))

    task = QueueProcessor()
    task.on_retry(RuntimeError("boom"), "task-3", (3,), {}, SimpleNamespace(exception=SimpleNamespace()))

    assert cancel_calls == []


@pytest.mark.django_db
def test_queue_processor_on_failure_records_error(monkeypatch):
    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler", SimpleNamespace)
    queue_item_pk = 5
    saved = []
    transitions = []

    class DummyQueueItem:
        def __init__(self):
            self.pk = queue_item_pk
            self.result = "existing"
            self.retry_delay = 10
            self.workflow_state = SimpleNamespace(code="queued")

        def save(self, update_fields):
            saved.append(update_fields)

        def fast_transition(self, code):
            transitions.append(code)

    qi = DummyQueueItem()

    def fake_lock(pk, operation):
        assert pk == queue_item_pk
        return operation(qi)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    task = QueueProcessor()

    try:
        raise RuntimeError("failure")
    except RuntimeError as exc:
        task.on_failure(exc, "task-4", (5, "sms"), {}, SimpleNamespace())

    assert "RuntimeError" in qi.result
    assert qi.retry_delay == 0
    assert saved == [["result", "retry_delay"]]
    assert transitions == ["error"]


@pytest.mark.django_db
def test_queue_processor_on_failure_skips_when_missing_queue_item(monkeypatch):
    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler", SimpleNamespace)

    def fake_lock(pk, operation):
        return operation(None)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    task = QueueProcessor()

    try:
        raise RuntimeError("missing")
    except RuntimeError as exc:
        task.on_failure(exc, "task-5", (6, "sms"), {}, SimpleNamespace())


@pytest.mark.django_db
def test_queue_processor_on_failure_does_not_transition_when_already_errored(monkeypatch):
    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler", SimpleNamespace)

    transitions = []

    class DummyQueueItem:
        def __init__(self):
            self.pk = 7
            self.result = ""
            self.retry_delay = 0
            self.workflow_state = SimpleNamespace(code="errored")

        def save(self, update_fields):
            pass

        def fast_transition(self, code):
            transitions.append(code)

    def fake_lock(pk, operation):
        return operation(DummyQueueItem())

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    task = QueueProcessor()

    try:
        raise RuntimeError("already errored")
    except RuntimeError as exc:
        task.on_failure(exc, "task-6", (7, "sms"), {}, SimpleNamespace())

    assert transitions == []


@pytest.mark.django_db
def test_send_message_invalid_method(monkeypatch):
    def fake_lock(pk, operation):
        return operation(SimpleNamespace(fast_transition=lambda code: None))

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    with pytest.raises(ValueError):
        send_message(1, "fax")


@pytest.mark.django_db
def test_send_message_ignores_invalid_transition(monkeypatch):
    def fake_lock(pk, operation):
        def fast_transition(code):
            raise InvalidTransitionError("bad transition")

        return operation(SimpleNamespace(fast_transition=fast_transition))

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    with pytest.raises(Ignore):
        send_message(1, "sms")


@pytest.mark.django_db
def test_send_message_sms_invokes_handler(monkeypatch, sms_queue_item):
    def fake_lock(pk, operation):
        assert pk == sms_queue_item.pk
        return operation(sms_queue_item)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    calls: list[int] = []

    def record_send_sms(self, qi):
        calls.append(qi.pk)

    monkeypatch.setattr("vueda.vdq.tasks.TwilioQueueItemHandler.send_sms", record_send_sms)
    monkeypatch.setattr("vueda.vdq.tasks.send_email", lambda qi: pytest.fail("send_email should not be called"))

    send_message(sms_queue_item.pk, "sms")

    assert calls == [sms_queue_item.pk]


@pytest.mark.django_db
def test_send_message_email_invokes_send_email(monkeypatch, email_queue_item):
    def fake_lock(pk, operation):
        assert pk == email_queue_item.pk
        return operation(email_queue_item)

    monkeypatch.setattr("vueda.vdq.tasks.with_locked_queue_item", fake_lock)

    calls: list[int] = []

    def record_send_email(qi):
        calls.append(qi.pk)

    monkeypatch.setattr("vueda.vdq.tasks.send_email", record_send_email)
    monkeypatch.setattr(
        "vueda.vdq.tasks.TwilioQueueItemHandler.send_sms",
        lambda self, qi: pytest.fail("send_sms should not be called"),
    )

    send_message(email_queue_item.pk, "email")

    assert calls == [email_queue_item.pk]


def test_setup_periodic_tasks_adds_status_check(settings, monkeypatch):
    settings.TWILIO_ACCOUNT_SID = "sid"
    settings.TWILIO_WEBHOOK_URL = ""

    dummy_twilio = SimpleNamespace()
    monkeypatch.setitem(sys.modules, "twilio", dummy_twilio)

    class DummySender:
        def __init__(self):
            self.signatures = []
            self.calls = []

        def signature(self, task_name):
            self.signatures.append(task_name)
            return f"sig:{task_name}"

        def add_periodic_task(self, interval, sig, name):
            self.calls.append((interval, sig, name))

    sender = DummySender()

    setup_periodic_tasks(sender)

    assert sender.signatures == ["vdq.check_sms_status"]
    assert sender.calls == [(30.0, "sig:vdq.check_sms_status", "check-sms-status")]
