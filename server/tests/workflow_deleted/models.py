# Models to use with info.

from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.history.models import SimpleHistoryModelMixin
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowDeleted(HasWorkflowModelMixin, SimpleHistoryModelMixin, models.Model):
    name = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.name
