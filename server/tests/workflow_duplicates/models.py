# Models to use with info.
from django.db import models

from vueda.core.models import VuedaBaseModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowDuplicates(HasWorkflowModelMixin, VuedaBaseModel):
    name = models.CharField(max_length=50, blank=True)

    class Meta(VuedaBaseModel.Meta):
        pass

    def __str__(self):
        return self.name
