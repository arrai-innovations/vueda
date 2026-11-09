# Models used to exercise the submit-time warning confirmation gate.

from django.db import models

from vueda.core.models import ActivatableBaseModel
from vueda.core.models import VuedaModel


class Thing(VuedaModel):
    name = models.CharField(max_length=255)
    count = models.IntegerField(default=0)

    class Vueda:
        class History:
            enabled = False
            reason = "A warning confirmation fixture; history would add an event table and triggers it never exercises."

    class Meta(VuedaModel.Meta):
        verbose_name = "Thing"
        verbose_name_plural = "Things"

    def __str__(self):
        return self.name


class Gadget(VuedaModel, ActivatableBaseModel):
    # Activatable so the activate/deactivate actions can exercise the viewset-level warning gate.
    name = models.CharField(max_length=255)

    class Vueda:
        class History:
            enabled = False
            reason = "A warning confirmation fixture; history would add an event table and triggers it never exercises."

    class Meta(VuedaModel.Meta):
        verbose_name = "Gadget"
        verbose_name_plural = "Gadgets"

    def __str__(self):
        return self.name
