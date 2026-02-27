from django.db import models

from vueda.core.models import VuedaModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowInitialState(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name
