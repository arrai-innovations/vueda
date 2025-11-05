from contextlib import AbstractContextManager
from contextlib import contextmanager
from logging import getLogger

from django.db import transaction

from vueda.vdq.models import QueueItem


log = getLogger(__name__)


@contextmanager
def lock_queue_item(pk, skip_locked=True) -> AbstractContextManager[QueueItem | None]:
    with transaction.atomic():
        qi = QueueItem.objects.select_for_update(skip_locked=skip_locked).filter(pk=pk).first()
        yield qi
