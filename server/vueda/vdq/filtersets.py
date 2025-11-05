from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.workflow.filtersets import HasWorkflowFilterSetMixin


class SendQueueFilterSet(HasWorkflowFilterSetMixin):
    class Meta:
        model = QueueItem
        fields = ["id", "queued", "last_updated", "method"]


class SentQueueFilterSet(HasWorkflowFilterSetMixin):
    class Meta:
        model = SentItem
        fields = ["id", "queued", "last_updated", "method"]
