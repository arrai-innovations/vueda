# Models used to exercise the submit-time warning confirmation gate.

from django.db import models


class Thing(models.Model):
    name = models.CharField(max_length=255)
    count = models.IntegerField(default=0)

    formatted_name = None

    class Meta:
        verbose_name = "Thing"
        verbose_name_plural = "Things"

    def __str__(self):
        return self.name
