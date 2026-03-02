from django.db import models

from vueda.core.models import VuedaModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowDuplicates(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField(max_length=50, blank=True)

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name
