from django.db import models

from vueda.core.models import VuedaBaseModel


class ReleaseNote(VuedaBaseModel):
    title = models.CharField(default="", max_length=255)
    notes = models.TextField(default="")
    date = models.DateTimeField(auto_now_add=True)
    formatted_name = None
    formatted_name_lookup_expression = "title"

    class Meta(VuedaBaseModel.Meta):
        app_label = "vueda.release"
        managed = True

    def __str__(self):
        return self.title
