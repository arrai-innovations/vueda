"""Model base classes and managers for django-simple-history integration."""

__all__ = (
    "ProxyAwareHistoricalRecords",
    "SimpleHistoryManager",
    "SimpleHistoryModelMixin",
    "VuedaHistoryModel",
)


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


class ProxyAwareHistoricalRecords(HistoricalRecords):
    """HistoricalRecords that shares the concrete parent's history table for proxy models.

    With inherit=True, simple-history creates a separate HistoricalXxx model for every
    subclass, including proxy models. For proxy models this causes a reverse accessor
    clash: both HistoricalFoo and HistoricalFooProxy try to add a `history_records`
    reverse accessor to FooProxy (which already inherits it from Foo). This subclass
    intercepts proxy models in finalize(), skips creating the duplicate historical model,
    and instead connects the save/delete signals so that history for proxy instances is
    recorded in the concrete parent's historical table.
    """

    def finalize(self, sender, **kwargs):
        if sender._meta.proxy:
            inherited = self.inherit and issubclass(sender, self.cls)
            if not inherited:
                return
            # Skip creating a separate historical model for this proxy. Wire up signals
            # so saves on proxy instances are still recorded in the parent's history table.
            models.signals.post_save.connect(self.post_save, sender=sender, weak=False)
            models.signals.post_delete.connect(self.post_delete, sender=sender, weak=False)
            models.signals.pre_delete.connect(self.pre_delete, sender=sender, weak=False)
            # Required so instance.history.values() returns results.
            setattr(sender, self.manager_name, sender._meta.proxy_for_model.history)
            # Required so pre_delete's deferred-field reload and utility functions work.
            sender._meta.simple_history_manager_attribute = self.manager_name
            return
        super().finalize(sender, **kwargs)


class SimpleHistoryModelMixin(models.Model):
    objects = SimpleHistoryManager()

    history = ProxyAwareHistoricalRecords(related_name="history_records", inherit=True)

    class Meta:
        abstract = True


class VuedaHistoryModel(SimpleHistoryModelMixin, VuedaModel):
    class Meta(BaseModelMeta):
        abstract = True
