from django.db import models

from vueda.core.models import VuedaModel


class WorkflowMovedFrom(VuedaModel):
    """The model a workflow code belongs to first."""

    name = models.CharField(max_length=255)

    class Vueda:
        class Workflow:
            enabled = True

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name


class WorkflowMovedTo(VuedaModel):
    """The model that takes the same workflow code over once the first workflow is gone."""

    name = models.CharField(max_length=255)

    class Vueda:
        class Workflow:
            enabled = True

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name
