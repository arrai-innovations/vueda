# Models to use with info.

from django.db import models

from vueda.core.models import BaseModelMeta


class NoExpandableFieldsData(models.Model):
    name = models.CharField(max_length=255)

    class Meta(BaseModelMeta):
        verbose_name = "No expandable field data"
        verbose_name_plural = "No expandable fields data"

    def __str__(self):
        return self.name
