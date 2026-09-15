from django.db import models

from vueda.core.models import VuedaModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowMovedFrom(HasWorkflowModelMixin, VuedaModel):
    """The model a workflow code belongs to first."""

    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name


class WorkflowMovedTo(HasWorkflowModelMixin, VuedaModel):
    """The model that takes the same workflow code over once the first workflow is gone."""

    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name
