# Serializers that produce some kind of error when fetching their model info.
from rest_framework import serializers

from tests.erring.models import NoExpandableFieldsData
from vueda.core.serializers import VuedaSerializer


class NoExpandableFieldsDataSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = NoExpandableFieldsData
        fields = [
            "id",
        ] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "test_function": serializers.SerializerMethodField,
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)

    def get_test_function(self, instance):
        return ["Test"]
