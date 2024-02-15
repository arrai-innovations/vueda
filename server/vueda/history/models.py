from django.db import models
from simple_history.models import HistoricalRecords

from vueda.core.models import BaseModelMeta


class SimpleHistoryModelMixin(models.Model):
    history = HistoricalRecords(related_name="history_records", inherit=True)

    class Meta(BaseModelMeta):
        abstract = True
