# Models to use with info.
from django.contrib.postgres import fields as postgres_fields
from django.db import models

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaBaseModel
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowMulti(HasWorkflowModelMixin, VuedaBaseModel):
    is_completed = models.BooleanField(default=False)
    due_date = models.DateField(blank=True, null=True)
    priority = models.IntegerField()
    description = models.TextField(blank=True)
    comments = postgres_fields.ArrayField(models.CharField(max_length=50), blank=True, default=list)
    location = models.CharField(max_length=50, choices=(("office", "office"), ("site", "onsite")), blank=True)
    execution_window = postgres_fields.DateRangeField(blank=True, null=True)
    age_limit = postgres_fields.IntegerRangeField(blank=True, null=True)

    class Meta(BaseModelMeta):
        pass

    def __str__(self):
        return self.description
