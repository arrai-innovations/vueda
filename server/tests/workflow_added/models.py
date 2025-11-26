from django.db import models

from vueda.history.models import VuedaHistoryBaseModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowAdded(HasWorkflowModelMixin, VuedaHistoryBaseModel):
    name = models.CharField(max_length=255)

    class Meta(VuedaHistoryBaseModel.Meta):
        permissions = (
            ("can_do_something", "Can do something"),
            ("can_do_something_else", "Can do something else"),
        )

    def __str__(self):
        return self.name
