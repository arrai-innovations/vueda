from django.db import models
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from simple_history.models import HistoricalRecords

from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaModel


class SimpleHistoryManager(models.Manager):
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(
            current_history_id=Subquery(
                queryset.filter(history_records__id=OuterRef("pk"))
                .annotate(current_history_id=Max("history_records__history_id"))
                .values("current_history_id")
            )
        )


class SimpleHistoryModelMixin(models.Model):
    objects = SimpleHistoryManager()

    history = HistoricalRecords(related_name="history_records", inherit=True)

    class Meta:
        abstract = True


class VuedaHistoryModel(SimpleHistoryModelMixin, VuedaModel):
    class Meta(BaseModelMeta):
        abstract = True
