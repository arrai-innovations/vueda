from django.db import models

from vueda.core.models import VuedaModel


class WorkflowReusedCodes(VuedaModel):
    name = models.CharField(max_length=255)

    class Vueda:
        class Workflow:
            enabled = True

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name
