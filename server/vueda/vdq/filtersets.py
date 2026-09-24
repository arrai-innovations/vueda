"""Filter sets for the VDQ send queue and sent items."""

__all__ = (
    "SendQueueFilterSet",
    "SentQueueFilterSet",
)

from vueda.core.filters import VuedaFilterSet
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem


class SendQueueFilterSet(VuedaFilterSet):
    class Meta:
        model = QueueItem
        fields = ["id", "queued", "last_updated", "method"]


class SentQueueFilterSet(VuedaFilterSet):
    class Meta:
        model = SentItem
        fields = ["id", "queued", "last_updated", "method"]
