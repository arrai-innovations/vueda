from django.db import models

from vueda.core.models import VuedaModel


class TrackedRecord(VuedaModel):
    """A tracked model whose event table and triggers arrive in their own migration.

    Rolling that migration back and applying it again is what the migration-path test exercises, so
    the app holds nothing else and nothing else depends on it.
    """

    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        pass

    def __str__(self):
        return self.name
