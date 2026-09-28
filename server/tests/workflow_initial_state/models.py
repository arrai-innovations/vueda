from django.db import models

from vueda.core.models import VuedaModel


class WorkflowInitialState(VuedaModel):
    name = models.CharField(max_length=255)

    class Vueda:
        class Workflow:
            enabled = True

    def __str__(self):
        return self.name
