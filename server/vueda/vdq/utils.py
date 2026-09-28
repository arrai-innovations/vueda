"""Row locks on VDQ queue items."""

__all__ = (
    "lock_queue_item",
    "with_locked_queue_item",
)

from collections.abc import Callable
from contextlib import AbstractContextManager
from contextlib import contextmanager
from logging import getLogger
from typing import TypeVar

from django.db import OperationalError
from django.db import connection
from django.db import transaction
from psycopg import errors

from vueda.vdq.exceptions import QueueItemLockError
from vueda.vdq.models import QueueItem


log = getLogger(__name__)

T = TypeVar("T")

# How long one attempt waits for a row lock. The transactions that lock queue items are short.
LOCK_TIMEOUT = "5s"
# How many transactions ``with_locked_queue_item`` runs before it raises ``QueueItemLockError``.
LOCK_ATTEMPTS = 3

# The errors that end one attempt but not the operation. A new transaction takes a fresh snapshot, so it can succeed
# where the failed one could not.
_RETRYABLE_ERRORS = (errors.SerializationFailure, errors.LockNotAvailable, errors.DeadlockDetected)


@contextmanager
def lock_queue_item(pk, skip_locked=True) -> AbstractContextManager[QueueItem | None]:
    """Lock a queue item's row. Yields ``None`` when the row is missing or, with ``skip_locked``, held."""
    with transaction.atomic():
        qi = QueueItem.objects.select_for_update(skip_locked=skip_locked).filter(pk=pk).first()
        yield qi


def with_locked_queue_item(pk, operation: Callable[[QueueItem | None], T]) -> T:
    """
    Run ``operation`` on the locked queue item in its own transaction, and return its result.

    ``operation`` receives ``None`` when the row does not exist. The lock waits for another transaction that holds
    the row, for at most ``LOCK_TIMEOUT``. At REPEATABLE READ, a transaction that waited for a holder that updated
    the row fails with a serialization error. A stale read of workflow state fails the same way when it is written.
    Either failure reruns ``operation`` in a new transaction, up to ``LOCK_ATTEMPTS`` times, so ``operation`` must be
    safe to run again. Call this outside any transaction: rolling back to a savepoint does not give the rerun a fresh
    snapshot.
    """
    for attempt in range(1, LOCK_ATTEMPTS + 1):
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("SET LOCAL lock_timeout = %s", [LOCK_TIMEOUT])
                queue_item = QueueItem.objects.select_for_update().filter(pk=pk).first()
                return operation(queue_item)
        except OperationalError as exc:
            if not isinstance(exc.__cause__, _RETRYABLE_ERRORS):
                raise
            log.info("Lock attempt %s of %s on QueueItem %s failed: %s", attempt, LOCK_ATTEMPTS, pk, exc)
    raise QueueItemLockError(f"QueueItem {pk} stayed locked through {LOCK_ATTEMPTS} attempts.")
