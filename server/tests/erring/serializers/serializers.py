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


class RelatedObjectsAreMissingDataSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = [
            "id",
            "no_name",
        ] + VuedaSerializer.Meta.fields
