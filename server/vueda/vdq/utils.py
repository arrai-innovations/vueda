"""Context manager for acquiring a database lock on a VDQ queue item."""

__all__ = ("lock_queue_item",)

from contextlib import AbstractContextManager
from contextlib import contextmanager
from logging import getLogger

from django.db import transaction

from vueda.vdq.models import QueueItem


log = getLogger(__name__)


@contextmanager
def lock_queue_item(pk, skip_locked=True) -> AbstractContextManager[QueueItem | None]:
    """
    Yield the queue item ``pk`` locked with ``SELECT FOR UPDATE`` inside a transaction. Yields ``None`` when
    the item does not exist, or when ``skip_locked`` is true and another transaction holds the lock.
    """
    with transaction.atomic():
        qi = QueueItem.objects.select_for_update(skip_locked=skip_locked).filter(pk=pk).first()
        yield qi
