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


class RelatedObjectsAreMissingDataSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = [
            "id",
            "no_name",
        ] + VuedaSerializer.Meta.fields
