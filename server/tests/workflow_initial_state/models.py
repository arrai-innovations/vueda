from django.db import models

from vueda.core.models import VuedaBaseModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowInitialState(HasWorkflowModelMixin, VuedaBaseModel):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name
