# Models to use with info.

from django.db import models

from vueda.core.models import VuedaModel


class NoExpandableFieldsData(VuedaModel):
    name = models.CharField(max_length=255)

    class Meta(VuedaModel.Meta):
        verbose_name = "No expandable field data"
        verbose_name_plural = "No expandable fields data"

    def __str__(self):
        return self.name


class NoNameField(VuedaModel):
    the_name_field = models.CharField(max_length=255)

    formatted_name = None

    class Meta(VuedaModel.Meta):
        verbose_name = "No name field"
        verbose_name_plural = "No name field"

    def __str__(self):
        return self.the_name_field


class PropertyFormattedName(VuedaModel):
    the_name_field = models.CharField(max_length=255)
    formatted_name = None

    @property
    def get_formatted_name(self):
        return self.the_name_field

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Property formatted name"
        verbose_name_plural = "Property formatted name"

    def __str__(self):
        return self.the_name_field


class BothFormattedNameConfigured(VuedaModel):
    the_name_field = models.CharField(max_length=255)
    formatted_name = None
    formatted_name_lookup_expression = "the_name_field"

    def get_formatted_name(self):
        return self.the_name_field

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Both formatted name configured"
        verbose_name_plural = "Both formatted name configured"

    def __str__(self):
        return self.the_name_field


class FormattedNameExpressionNotString(VuedaModel):
    the_name_field = models.CharField(max_length=255)
    formatted_name = None
    formatted_name_lookup_expression = VuedaModel

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Formatted name expression not string"
        verbose_name_plural = "Formatted name expression not string"

    def __str__(self):
        return self.pk


class ValidGetFormattedName(VuedaModel):
    the_name_field = models.CharField(max_length=255)
    formatted_name = None

    def get_formatted_name(self):
        return self.the_name_field

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Valid get formatted name"
        verbose_name_plural = "Valid get formatted name"

    def __str__(self):
        return self.the_name_field


class ValidLookupExpression(VuedaModel):
    the_name_field = models.CharField(max_length=255)
    formatted_name = None
    formatted_name_lookup_expression = "the_name_field"

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Valid lookup expression"
        verbose_name_plural = "Valid lookup expression"

    def __str__(self):
        return self.the_name_field


class RelatedObjectsAreMissingData(VuedaModel):
    no_name = models.ManyToManyField(NoNameField, blank=True)

    formatted_name = None

    class Meta(VuedaModel.Meta):
        verbose_name = "Related objects are missing data"
        verbose_name_plural = "Related objects are missing data"

    def __str__(self):
        return self.pk
