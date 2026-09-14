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


class BothFormattedNameSelectRelatedConfigured(VuedaModel):
    the_name_field = models.CharField(max_length=255)
    formatted_name = None
    formatted_name_lookup_expression = "the_name_field"
    formatted_name_select_related = ("the_name_field",)

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Both formatted name select related configured"
        verbose_name_plural = "Both formatted name select related configured"

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


class PlainManagerLookupExpression(VuedaModel):
    """Reaches formatted_name through a lookup expression, but declares a plain `models.Manager` as
    its own `objects`.

    Django takes the first manager in `Meta.managers` order as the default, so this one shadows the
    `FormattedNameManager` that `FormattedNameBaseModel` provides and nothing annotates
    `formatted_name` onto the model's own querysets. `vueda_info.E009` is the only signal: the model
    imports and checks cleanly otherwise, and then `formatted_name` fails to resolve on every queryset
    that didn't come from `VuedaViewSet.get_queryset`.
    """

    the_name_field = models.CharField(max_length=255)
    formatted_name = None
    formatted_name_lookup_expression = "the_name_field"

    objects = models.Manager()

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Plain manager lookup expression"
        verbose_name_plural = "Plain manager lookup expression"

    def __str__(self):
        return self.the_name_field


class MultiValuedLookupExpression(VuedaModel):
    """Reaches its formatted name across a many-to-many, which joins a row per related object.

    VUEDA annotates `formatted_name_lookup_expression` onto every queryset of the model, so this
    declaration would silently multiply the rows the model returns everywhere rather than failing
    anywhere. `vueda_info.E008` is what reports it.
    """

    the_name_fields = models.ManyToManyField(ValidLookupExpression, blank=True)

    formatted_name = None
    formatted_name_lookup_expression = "the_name_fields__the_name_field"

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Multi valued lookup expression"
        verbose_name_plural = "Multi valued lookup expression"

    def __str__(self):
        return self.pk


class SingleValuedLookupExpression(VuedaModel):
    """The single-valued counterpart of MultiValuedLookupExpression, reaching its formatted name
    across a nullable forward foreign key.

    A nullable relation produces a LEFT OUTER JOIN and still matches at most one row, so this is a
    valid declaration at any depth and `vueda_info.E008` has to stay quiet about it.
    """

    the_name_source = models.ForeignKey(ValidLookupExpression, null=True, blank=True, on_delete=models.PROTECT)

    formatted_name = None
    formatted_name_lookup_expression = "the_name_source__the_name_field"

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Single valued lookup expression"
        verbose_name_plural = "Single valued lookup expression"

    def __str__(self):
        return self.pk


class RelatedObjectsAreMissingData(VuedaModel):
    no_name = models.ManyToManyField(NoNameField, blank=True)

    formatted_name = None

    class Meta(VuedaModel.Meta):
        verbose_name = "Related objects are missing data"
        verbose_name_plural = "Related objects are missing data"

    def __str__(self):
        return self.pk


class FalseyFormattedNamesLookup(VuedaModel):
    description = models.CharField(max_length=255)

    formatted_name = None
    formatted_name_lookup_expression = False

    class Meta(VuedaModel.Meta):
        verbose_name = "falsey formatted names lookup"
        verbose_name_plural = "falsey formatted names lookups"

    def __str__(self):
        return self.pk


class ModelOrderingQueryset(VuedaModel):
    """Declares a `Meta.ordering` for a viewset's class-level queryset to disagree with.

    `vueda_info.E010` compares the two, and the conflict it exists to report needs a model that
    declares an ordering of its own — no other model here does. Descending, so a viewset ordering the
    same field ascending differs by direction alone, which is the shape the check has to catch.
    """

    the_name_field = models.CharField(max_length=255)

    formatted_name = None

    class Meta(VuedaModel.Meta):
        managed = False
        ordering = ("-the_name_field",)
        verbose_name = "Model ordering queryset"
        verbose_name_plural = "Model ordering queryset"

    def __str__(self):
        return self.the_name_field


class NonVuedaFormattedName(models.Model):
    """Plain model (no VuedaModel heritage) with formatted_name = None and no alternative configured."""

    some_field = models.CharField(max_length=255)
    formatted_name = None

    class Meta:
        app_label = "erring"
        managed = False

    def __str__(self):
        return self.some_field


class SourceResolutionRelated(models.Model):
    """Related model reached through an unresolvable dotted serializer ``source`` or lookup expression.

    A source-mapped field, a dotted source that resolves, a traversing lookup expression that resolves,
    and a SerializerMethodField are all covered against the real tests.store fixtures instead (see
    PackingBoxSerializer.label, CartSerializer.customer_relation, Customer/CartItem/OrderItem/
    InventoryRecord/OrderItemCompositePK's formatted_name, and CustomerSerializer.
    number_of_ordered_products). This app is reserved for resolution that is meant to fail.
    """

    class Meta:
        app_label = "erring"
        managed = False


class SourceResolution(VuedaModel):
    """Backs SourceResolutionSerializer's set of source= failure modes: partial progress via a
    missing terminal attribute, partial progress via a non-relation intermediate field, and a
    single-segment source that fails at its very first attempt. See that serializer for detail.
    """

    related = models.ForeignKey(SourceResolutionRelated, on_delete=models.DO_NOTHING, null=True)

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Source resolution"
        verbose_name_plural = "Source resolution"

    def __str__(self):
        return self.pk


class UnresolvableLookupExpression(VuedaModel):
    """Its formatted_name_lookup_expression resolves the relation but not the terminal field name --
    partial progress, the same shape of break SourceResolution.bogus exercises for a source=.
    """

    related = models.ForeignKey(SourceResolutionRelated, on_delete=models.DO_NOTHING, null=True)

    formatted_name = None
    formatted_name_lookup_expression = "related__does_not_exist"

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Unresolvable lookup expression"
        verbose_name_plural = "Unresolvable lookup expression"

    def __str__(self):
        return self.pk


class UnresolvableLookupExpressionAtFirstSegment(VuedaModel):
    """Its formatted_name_lookup_expression's first segment doesn't exist at all. Unlike a source=
    failing the same way, this must still be reported: a lookup_expression is fed straight to
    models.F() for queryset annotation and to Django admin's lookup_field(), so it has no
    legitimate non-model-backed reading the way a source= pointed at a @property does -- it is
    always a real misconfiguration, wherever in the path it breaks.
    """

    formatted_name = None
    formatted_name_lookup_expression = "does_not_exist"

    class Meta(VuedaModel.Meta):
        managed = False
        verbose_name = "Unresolvable lookup expression at first segment"
        verbose_name_plural = "Unresolvable lookup expression at first segment"

    def __str__(self):
        return self.pk
