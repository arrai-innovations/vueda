# Serializers that produce some kind of error when fetching their model info.
from rest_framework import serializers

from tests.erring import models as my_models
from vueda.core.serializers import VuedaSerializer


class NoExpandableFieldsDataSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "test_function": serializers.SerializerMethodField,
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)

    def get_test_function(self, instance):
        return ["Test"]


class PropertyFormattedNameSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.PropertyFormattedName
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class BothFormattedNameConfiguredSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.BothFormattedNameConfigured
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class NoNameFieldSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoNameField
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class ModelOrderingQuerysetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.ModelOrderingQueryset
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class FormattedNameExpressionNotStringSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.FormattedNameExpressionNotString
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class ValidGetFormattedNameSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.ValidGetFormattedName
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class ValidLookupExpressionSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.ValidLookupExpression
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class PlainManagerLookupExpressionSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.PlainManagerLookupExpression
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class MultiValuedLookupExpressionSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.MultiValuedLookupExpression
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class SingleValuedLookupExpressionSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.SingleValuedLookupExpression
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class RelatedObjectsAreMissingDataSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": (NoNameFieldSerializer, {"many": True}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class FalseyFormattedNamesLookupSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.FalseyFormattedNamesLookup
        fields = ["id", "description"]


class NonVuedaFormattedNameSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NonVuedaFormattedName
        fields = ["id", "some_field"] + VuedaSerializer.Meta.fields


class SourceResolutionSerializer(VuedaSerializer):
    """Exercises every source= failure mode:

    - bogus resolves its "related" segment but not "does_not_exist" -- partial progress, reported.
    - through_non_relation resolves "formatted_name" (a real field) but can't continue past it,
      since a CharField/GeneratedField isn't a relation -- also partial progress, also reported,
      but through the NotRelationField branch of the walk rather than FieldDoesNotExist.
    - typo's source doesn't exist at all, and has no dot -- but it's explicit, a developer's
      deliberate claim about a path, so it is reported the same as bogus/through_non_relation
      despite failing at the very first segment.
    - implicit_typo sets no source= at all (defaults to its own field name, which is also not a
      real field) -- reported the same as typo, since an implicit source gives no way to tell a
      field-name typo from a deliberate computed field apart from the two explicit opt-outs
      (field.source == "*", or a callable get_<field_name>() on the model).
    - computed is a SerializerMethodField, exercising its exclusion -- it is never model-backed
      and must never produce a warning.
    """

    bogus = serializers.CharField(source="related.does_not_exist", read_only=True)
    through_non_relation = serializers.CharField(source="formatted_name.foo", read_only=True)
    typo = serializers.CharField(source="does_not_exist_at_all", read_only=True)
    implicit_typo = serializers.CharField(read_only=True)
    computed = serializers.SerializerMethodField()

    class Meta(VuedaSerializer.Meta):
        model = my_models.SourceResolution
        fields = [
            "id",
            "bogus",
            "through_non_relation",
            "typo",
            "implicit_typo",
            "computed",
        ] + VuedaSerializer.Meta.fields

    def get_computed(self, instance):
        return "computed-value"


class UnresolvableLookupExpressionSerializer(VuedaSerializer):
    """Its model's formatted_name_lookup_expression resolves the relation but not the terminal field."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.UnresolvableLookupExpression
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class UnresolvableLookupExpressionAtFirstSegmentSerializer(VuedaSerializer):
    """Its model's formatted_name_lookup_expression doesn't exist at all -- unlike a source= failing
    at its first segment, this must still warn (see the model's docstring)."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.UnresolvableLookupExpressionAtFirstSegment
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields


class ExpandableFieldsListSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": [NoNameFieldSerializer, {}],
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsBadTupleLengthSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": (NoNameFieldSerializer, {}, "extra"),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsEmptyTupleSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": (),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsUnresolvableStringSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": "tests.erring.serializers.serializers.DoesNotExistSerializer",
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsNotClassSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": 5,
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsNonDictOptionsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": (NoNameFieldSerializer, []),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsNotFieldSubclassSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": int,
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsValidStringSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": "tests.erring.serializers.serializers.NoNameFieldSerializer",
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class UnregisteredExpandableChildSerializer(VuedaSerializer):
    """Never passed to info.register_serializer(); only reachable via another serializer's expandable_fields."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": int,
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsPointsAtUnregisteredSerializer(VuedaSerializer):
    """Its own expandable_fields entry is valid, but points at an unregistered serializer whose entry is not."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "child": (UnregisteredExpandableChildSerializer, {}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ExpandableFieldsNestedInvalidSerializer(VuedaSerializer):
    """Its own expandable_fields entry is valid, but points at a serializer whose entry is not."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "bad_child": (ExpandableFieldsListSerializer, {}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer(serializers.ModelSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "no_name": (NoNameFieldSerializer, []),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
