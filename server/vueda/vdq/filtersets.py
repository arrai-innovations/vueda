from vueda.core.filters import VuedaFilterSet
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.workflow.filtersets import HasWorkflowFilterSetMixin


class SendQueueFilterSet(HasWorkflowFilterSetMixin, VuedaFilterSet):
    class Meta:
        model = QueueItem
        fields = ["id", "queued", "last_updated", "method"]


class SentQueueFilterSet(HasWorkflowFilterSetMixin, VuedaFilterSet):
    class Meta:
        model = SentItem
        fields = ["id", "queued", "last_updated", "method"]
