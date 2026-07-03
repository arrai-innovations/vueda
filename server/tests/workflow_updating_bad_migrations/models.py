from django.db import models

from vueda.history.models import VuedaHistoryModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowUpdatingBadMigrations(HasWorkflowModelMixin, VuedaHistoryModel):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name
