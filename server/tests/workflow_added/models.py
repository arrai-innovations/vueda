# Models to use with info.

from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaBaseModel
from vueda.history.models import SimpleHistoryModelMixin
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowAdded(HasWorkflowModelMixin, SimpleHistoryModelMixin, VuedaBaseModel):
    name = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        permissions = (
            ("can_do_something", "Can do something"),
            ("can_do_something_else", "Can do something else"),
        )

    def __str__(self):
        return self.name
