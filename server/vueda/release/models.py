from django.db import models

from vueda.core.models import VuedaModel


class ReleaseNote(VuedaModel):
    title = models.CharField(default="", max_length=255)
    notes = models.TextField(default="")
    date = models.DateTimeField(auto_now_add=True)
    formatted_name = None
    formatted_name_lookup_expression = "title"

    def __str__(self):
        return self.title
