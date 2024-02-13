from django.db import models
from simple_history.models import HistoricalRecords


class BaseModelMeta:
    default_permissions = ("create", "read", "update", "delete", "list")


class SimpleHistoryModelMixin(models.Model):
    history = HistoricalRecords(related_name="history_records", inherit=True)

    class Meta(BaseModelMeta):
        abstract = True
