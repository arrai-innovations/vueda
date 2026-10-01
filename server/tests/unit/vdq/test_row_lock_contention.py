"""Queue item behavior while a second connection holds the item's row lock.

Generated projects run Postgres at REPEATABLE READ, where a waiter whose holder updated the row fails with a
serialization error instead of reading the new row. The test settings run at READ COMMITTED, so these tests switch
the connection under test to REPEATABLE READ.
"""

import threading
from datetime import timedelta
from time import monotonic
from time import sleep
from types import SimpleNamespace

import pytest
from celery.exceptions import Ignore
from django.db import connection
from django.db import transaction
from django.db.backends.postgresql.psycopg_any import IsolationLevel
from django.utils import timezone

from vueda.vdq import utils
from vueda.vdq.exceptions import QueueItemLockError
from vueda.vdq.handlers import TwilioQueueItemHandler
from vueda.vdq.handlers import send_email
from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.tasks import LOCK_RETRY_COUNTDOWN
from vueda.vdq.tasks import QueueProcessor
from vueda.vdq.tasks import send_message
from vueda.vdq.utils import with_locked_queue_item


pytestmark = pytest.mark.django_db(transaction=True)

HOLD_LIMIT_SECONDS = 5


class RowLockHolder:
    """Hold a queue item's row lock from a second connection, in a thread.

    ``action`` runs on the locked item before the lock is marked held, so a holder can write the row. With
    ``release="when_blocked"`` the holder commits once another backend waits on a lock; with ``"manual"`` it commits
    when ``finish`` is called. Either way it commits after ``HOLD_LIMIT_SECONDS`` at the latest.
    """

    def __init__(self, pk, *, action=None, release="when_blocked"):
        self.pk = pk
        self.action = action
        self.release = release
        self.held = threading.Event()
        self.released = threading.Event()
        self.error = None
        self.thread = threading.Thread(target=self._run, daemon=True)

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *exc_info):
        self.finish()

    def start(self):
        self.thread.start()
        assert self.held.wait(HOLD_LIMIT_SECONDS), "the holder did not take the row lock"
        if self.error:
            raise self.error

    def finish(self):
        self.released.set()
        self.thread.join(HOLD_LIMIT_SECONDS * 2)
        if self.error:
            raise self.error

    def _run(self):
        try:
            with transaction.atomic():
                queue_item = QueueItem.objects.select_for_update().get(pk=self.pk)
                if self.action:
                    self.action(queue_item)
                self.held.set()
                if self.release == "when_blocked":
                    self._wait_for_blocked_backend()
                else:
                    self.released.wait(HOLD_LIMIT_SECONDS)
        except BaseException as exc:
            self.error = exc
            self.held.set()
        finally:
            connection.close()

    def _wait_for_blocked_backend(self):
        deadline = monotonic() + HOLD_LIMIT_SECONDS
        with connection.cursor() as cursor:
            while monotonic() < deadline and not self.released.is_set():
                # pg_stat_activity is read once per transaction unless the snapshot is cleared.
                cursor.execute("SELECT pg_stat_clear_snapshot()")
                cursor.execute(
                    "SELECT count(*) FROM pg_stat_activity"
                    " WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock'"
                )
                if cursor.fetchone()[0]:
                    return
                sleep(0.02)


def touch_row(queue_item):
    QueueItem.objects.filter(pk=queue_item.pk).update(last_updated=timezone.now())


@pytest.fixture
def repeatable_read():
    options = connection.settings_dict.setdefault("OPTIONS", {})
    previous = options.get("isolation_level")
    connection.close()
    options["isolation_level"] = IsolationLevel.REPEATABLE_READ
    # psycopg applies the level to the transactions it begins, not to autocommit statements.
    with transaction.atomic(), connection.cursor() as cursor:
        cursor.execute("SELECT current_setting('transaction_isolation')")
        assert cursor.fetchone()[0] == "repeatable read"
    yield
    connection.close()
    if previous is None:
        options.pop("isolation_level", None)
    else:
        options["isolation_level"] = previous


def workflow_code(pk):
    return QueueItem.objects.get(pk=pk).workflow_state.code


@pytest.fixture
def short_lock_timeout(monkeypatch):
    monkeypatch.setattr(utils, "LOCK_TIMEOUT", "50ms")


@pytest.fixture
def sending_email_item(queue_item_email):
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    return queue_item_email


def test_send_message_sends_after_a_holder_updates_the_row(monkeypatch, repeatable_read, email_queue_item):
    sent = []
    monkeypatch.setattr("vueda.vdq.tasks.send_email", lambda qi: sent.append(qi.pk))

    with RowLockHolder(email_queue_item.pk, action=touch_row):
        send_message(email_queue_item.pk, "email")

    assert sent == [email_queue_item.pk]
    assert workflow_code(email_queue_item.pk) == "sending"


def test_send_message_ignores_an_item_the_holder_cancelled(monkeypatch, repeatable_read, email_queue_item):
    sent = []
    monkeypatch.setattr("vueda.vdq.tasks.send_email", lambda qi: sent.append(qi.pk))

    with RowLockHolder(email_queue_item.pk, action=lambda qi: qi.fast_transition("cancel")):
        with pytest.raises(Ignore):
            send_message(email_queue_item.pk, "email")

    assert sent == []
    assert workflow_code(email_queue_item.pk) == "cancelled"


def test_on_retry_records_the_retry_after_a_holder_updates_the_row(monkeypatch, repeatable_read, sending_email_item):
    revoked = []
    monkeypatch.setattr("vueda.vdq.celery.app.control.revoke", lambda task_id, **kwargs: revoked.append(task_id))
    delay = 30
    einfo = SimpleNamespace(exception=SimpleNamespace(exc=SimpleNamespace(when=delay)))

    with RowLockHolder(sending_email_item.pk, action=touch_row):
        QueueProcessor().on_retry(RuntimeError("transient"), "task-1", (sending_email_item.pk, "email"), {}, einfo)

    queue_item = QueueItem.objects.get(pk=sending_email_item.pk)
    assert queue_item.task_id == "task-1"
    assert queue_item.retry_delay == delay
    assert queue_item.workflow_state.code == "delayed"
    assert revoked == []


def test_on_failure_records_the_error_after_a_holder_updates_the_row(repeatable_read, sending_email_item):
    with RowLockHolder(sending_email_item.pk, action=touch_row):
        try:
            raise RuntimeError("provider down")
        except RuntimeError as exc:
            QueueProcessor().on_failure(exc, "task-2", (sending_email_item.pk, "email"), {}, SimpleNamespace())

    queue_item = QueueItem.objects.get(pk=sending_email_item.pk)
    assert "provider down" in queue_item.result
    assert queue_item.workflow_state.code == "errored"


def test_send_email_records_the_message_id_while_a_holder_updates_the_row(
    monkeypatch, repeatable_read, sending_email_item
):
    holder = RowLockHolder(sending_email_item.pk, action=touch_row)

    def fake_send(self, *args, **kwargs):
        self.anymail_status = SimpleNamespace(message_id="message-1", status={"sent"})
        holder.start()
        return 1

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    try:
        send_email(sending_email_item)
    finally:
        holder.finish()

    assert AnyMailQueueItem.objects.get(queue_item=sending_email_item).message_id == "message-1"
    assert workflow_code(sending_email_item.pk) == "awaiting"


def test_send_sms_records_the_sid_while_a_holder_updates_the_row(repeatable_read, queue_item_sms):
    holder = RowLockHolder(queue_item_sms.pk, action=touch_row)

    def create(**kwargs):
        holder.start()
        return SimpleNamespace(error_code=None, error_message="", status="sent", sid="SM1")

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=SimpleNamespace(create=create))

    try:
        handler.send_sms(queue_item_sms)
    finally:
        holder.finish()

    queue_item = QueueItem.objects.get(pk=queue_item_sms.pk)
    assert SMSQueueItem.objects.get(queue_item=queue_item).message_sid == "SM1"
    assert queue_item.result == "sent"
    assert queue_item.workflow_state.code == "awaiting"


def test_send_sms_records_a_rejection_while_a_holder_updates_the_row(monkeypatch, repeatable_read, queue_item_sms):
    class FakeTwilioRestException(Exception):  # noqa: N818
        def __init__(self, msg):
            self.msg = msg

    monkeypatch.setattr("vueda.vdq.handlers.TwilioRestException", FakeTwilioRestException)
    holder = RowLockHolder(queue_item_sms.pk, action=touch_row)

    def create(**kwargs):
        holder.start()
        raise FakeTwilioRestException("rejected")

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=SimpleNamespace(create=create))

    try:
        handler.send_sms(queue_item_sms)
    finally:
        holder.finish()

    queue_item = QueueItem.objects.get(pk=queue_item_sms.pk)
    assert "rejected" in queue_item.result
    assert queue_item.workflow_state.code == "errored"


def test_pull_sms_timeout_only_continues_past_a_held_row(settings, repeatable_read, sender, receiver):
    settings.VDQ_TWILIO_SMS_TIMEOUT_HOURS = 1
    items = []
    for offset, sid in ((2, "SM-HELD"), (1, "SM-FREE")):
        queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="sms")
        SMSQueueItem.objects.create(queue_item=queue_item, body="hello", media_url=None, message_sid=sid)
        queue_item.fast_transition("send")
        queue_item.fast_transition("await")
        past = timezone.now() - timedelta(hours=3 + offset)
        QueueItem.objects.filter(pk=queue_item.pk).update(queued=past, done_since=past)
        items.append(queue_item)
    held, free = items

    delivered = SimpleNamespace(status="delivered", error_code=None, error_message="")
    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=lambda sid: SimpleNamespace(fetch=lambda: delivered))

    with RowLockHolder(held.pk, release="manual"):
        handler.pull_sms_timeout_only()

    assert workflow_code(held.pk) == "awaiting"
    assert workflow_code(free.pk) == "succeeded"


def test_with_locked_queue_item_raises_when_the_row_stays_held(repeatable_read, short_lock_timeout, email_queue_item):
    ran = []

    with RowLockHolder(email_queue_item.pk, release="manual"):
        with pytest.raises(QueueItemLockError):
            with_locked_queue_item(email_queue_item.pk, ran.append)

    assert ran == []


def test_with_locked_queue_item_passes_none_for_a_missing_row(repeatable_read):
    assert with_locked_queue_item(999999, lambda qi: qi) is None


def test_send_message_retries_later_when_the_row_stays_held(
    monkeypatch, repeatable_read, short_lock_timeout, email_queue_item
):
    retries = []

    class RetryScheduledError(Exception):
        pass

    def fake_retry(exc=None, countdown=None, **kwargs):
        retries.append((type(exc), countdown))
        return RetryScheduledError()

    monkeypatch.setattr(send_message, "retry", fake_retry)
    monkeypatch.setattr("vueda.vdq.tasks.send_email", lambda qi: pytest.fail("send_email should not be called"))

    with RowLockHolder(email_queue_item.pk, release="manual"):
        with pytest.raises(RetryScheduledError):
            send_message(email_queue_item.pk, "email")

    assert retries == [(QueueItemLockError, LOCK_RETRY_COUNTDOWN)]
    assert workflow_code(email_queue_item.pk) == "queued"


def test_send_email_names_the_message_id_when_the_row_stays_held(
    monkeypatch, repeatable_read, short_lock_timeout, sending_email_item
):
    holder = RowLockHolder(sending_email_item.pk, release="manual")

    def fake_send(self, *args, **kwargs):
        self.anymail_status = SimpleNamespace(message_id="message-2", status={"sent"})
        holder.start()
        return 1

    monkeypatch.setattr("django.core.mail.EmailMultiAlternatives.send", fake_send)

    try:
        with pytest.raises(QueueItemLockError, match="message-2"):
            send_email(sending_email_item)
    finally:
        holder.finish()


def test_send_sms_names_the_sid_when_the_row_stays_held(repeatable_read, short_lock_timeout, queue_item_sms):
    holder = RowLockHolder(queue_item_sms.pk, release="manual")

    def create(**kwargs):
        holder.start()
        return SimpleNamespace(error_code=None, error_message="", status="sent", sid="SM2")

    handler = TwilioQueueItemHandler()
    handler.twilio_client = SimpleNamespace(messages=SimpleNamespace(create=create))

    try:
        with pytest.raises(QueueItemLockError, match="SM2"):
            handler.send_sms(queue_item_sms)
    finally:
        holder.finish()
