# Models to use with info.

from django.db import models

from vueda.core.models import VuedaBaseModel


class NoExpandableFieldsData(VuedaBaseModel):
    name = models.CharField(max_length=255)

    class Meta(VuedaBaseModel.Meta):
        verbose_name = "No expandable field data"
        verbose_name_plural = "No expandable fields data"

    def __str__(self):
        return self.name


class NoNameField(VuedaBaseModel):
    the_name_field = models.CharField(max_length=255)

    formatted_name = None

    class Meta(VuedaBaseModel.Meta):
        verbose_name = "No name field"
        verbose_name_plural = "No name field"

    def __str__(self):
        return self.the_name_field


class RelatedObjectsAreMissingData(VuedaBaseModel):
    no_name = models.ManyToManyField(NoNameField, blank=True)

    formatted_name = None

    class Meta(VuedaBaseModel.Meta):
        verbose_name = "Related objects are missing data"
        verbose_name_plural = "Related objects are missing data"

    def __str__(self):
        return self.pk
