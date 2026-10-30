# Models to use with info.

from django.db import models

from vueda.core.models import VuedaModel


class LogRecords(VuedaModel):
    created = models.DateTimeField(auto_now_add=True)
    message = models.TextField()
    name = models.CharField(max_length=255)  # Name of the logger used.
    process_id = models.IntegerField()
    traceback = models.TextField()

    formatted_name = None

    class Vueda:
        class History:
            enabled = False
            reason = "A logging fixture; history would add an event table and triggers it never exercises."

    class Meta(VuedaModel.Meta):
        verbose_name = "Log record"
        verbose_name_plural = "Log records"

    def __str__(self):
        return f"{self.created} - {self.name} - {self.message[:20]}..."

    def get_formatted_name(self):
        return str(self)
