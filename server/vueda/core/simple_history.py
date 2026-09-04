"""Shared django-simple-history integration for VUEDA models.

This lives in ``vueda.core`` rather than ``vueda.history`` because models outside the history app
track their own history. ``vueda.workflow`` does, and it must not import the optional history app
to get that behaviour. ``simple_history`` is an unconditional dependency, so nothing here needs
the history app installed.
"""

__all__ = (
    "ProxyAwareHistoricalRecords",
    "SimpleHistoryManager",
    "SimpleHistoryModelMixin",
)

from django.db import models
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from simple_history.models import HistoricalRecords

from vueda.core.models import FormattedNameManager


class SimpleHistoryManager(FormattedNameManager):
    """
    Adds ``current_history_id`` to every queryset of a ``SimpleHistoryModelMixin`` model.

    Inherits ``FormattedNameManager`` rather than ``models.Manager`` because
    ``SimpleHistoryModelMixin`` declares this as ``objects`` on an abstract base that sits closer in
    the MRO than ``FormattedNameBaseModel`` does. Django resolves a model's default manager by
    ``(depth, creation_counter)``, so this manager shadows ``FormattedNameManager`` for every
    ``VuedaHistoryModel`` subclass. Without inheriting it, any such model reaching its formatted name
    through ``formatted_name_lookup_expression`` would lose the ``formatted_name`` annotation on every
    queryset it builds, including the ones its own ``Meta.ordering`` is applied to. The
    ``vueda_info.E009`` system check reports a model left in that position by some other manager.
    """

    def get_queryset(self):
        # Taken before the `formatted_name` annotation is applied, because the subquery below
        # aggregates: an annotation on its source queryset would join into the subquery's GROUP BY
        # for a column it never selects. This is the queryset a plain `models.Manager` would build,
        # which is what the subquery was written against.
        history_source = models.Manager.get_queryset(self)

        queryset = super().get_queryset()
        return queryset.annotate(
            current_history_id=Subquery(
                history_source.filter(history_records__id=OuterRef("pk"))
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
            setattr(sender, self.manager_name, sender._meta.concrete_model.history)
            # Required so pre_delete's deferred-field reload and utility functions work.
            sender._meta.simple_history_manager_attribute = self.manager_name
            return
        super().finalize(sender, **kwargs)


class SimpleHistoryModelMixin(models.Model):
    objects = SimpleHistoryManager()

    history = ProxyAwareHistoricalRecords(related_name="history_records", inherit=True)

    class Meta:
        abstract = True
