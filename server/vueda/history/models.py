"""Model base class for VUEDA models that track audit history."""

__all__ = ("VuedaHistoryModel",)


from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaModel
from vueda.core.simple_history import SimpleHistoryModelMixin


class VuedaHistoryModel(SimpleHistoryModelMixin, VuedaModel):
    class Meta(BaseModelMeta):
        abstract = True
