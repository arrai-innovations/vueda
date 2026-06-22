# Models used to exercise the submit-time warning confirmation gate.

from django.db import models

from vueda.core.models import ActivatableBaseModel


class Thing(models.Model):
    name = models.CharField(max_length=255)
    count = models.IntegerField(default=0)

    formatted_name = None

    class Meta:
        verbose_name = "Thing"
        verbose_name_plural = "Things"

    def __str__(self):
        return self.name


class Gadget(ActivatableBaseModel):
    # Activatable so the activate/deactivate actions can exercise the viewset-level warning gate.
    name = models.CharField(max_length=255)

    formatted_name = None

    class Meta:
        verbose_name = "Gadget"
        verbose_name_plural = "Gadgets"

    def __str__(self):
        return self.name
