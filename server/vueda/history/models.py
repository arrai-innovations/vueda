from django.db import models
from django.db.models import Max
from simple_history.models import HistoricalRecords

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaBaseModel


class SimpleHistoryManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().annotate(current_history_id=Max("history_records__history_id"))


class SimpleHistoryModelMixin(models.Model):
    objects = SimpleHistoryManager()

    history = HistoricalRecords(related_name="history_records", inherit=True)

    class Meta:
        abstract = True


class VuedaHistoryBaseModel(SimpleHistoryModelMixin, VuedaBaseModel):
    class Meta(BaseModelMeta):
        abstract = True
