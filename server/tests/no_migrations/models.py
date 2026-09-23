# Model to use with group and workflow management commands.
from django.db import models

from vueda.core.models import VuedaModel


class NoMigrations(VuedaModel):
    name = models.CharField(max_length=255)

    class Vueda:
        class Workflow:
            enabled = True

    def __str__(self):
        return self.name
