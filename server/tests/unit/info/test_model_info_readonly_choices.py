"""
Model-info `model_fields` reports the inline `{label, value}` choices of a field with static choices, whether the
field is read-only or writable. A read-only relation field reports its related model without choices.
"""

import pytest
from rest_framework import serializers

from tests.store.models import CustomerOrder
from vueda.core.serializers import VuedaSerializer
from vueda.info.serializers import ModelInfoSerializer


SHIPPING_METHOD_CHOICES = [
    {"label": "Free", "value": "free"},
    {"label": "Regular", "value": "regular"},
    {"label": "Express", "value": "express"},
]


class WritableShippingSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = CustomerOrder
        fields = ["id", "shipping_method", "customer", *VuedaSerializer.Meta.fields]


class MetaReadOnlyShippingSerializer(WritableShippingSerializer):
    class Meta(WritableShippingSerializer.Meta):
        read_only_fields = ["shipping_method", "customer"]


class DeclaredReadOnlyShippingSerializer(WritableShippingSerializer):
    shipping_method = serializers.ChoiceField(
        choices=CustomerOrder._meta.get_field("shipping_method").choices, read_only=True
    )


class GetFieldsReadOnlyShippingSerializer(WritableShippingSerializer):
    def get_fields(self):
        fields = super().get_fields()
        fields["shipping_method"].read_only = True
        return fields


@pytest.mark.django_db
class TestModelInfoReadOnlyChoices:
    @pytest.mark.parametrize(
        ("serializer_class", "read_only"),
        [
            pytest.param(WritableShippingSerializer, False, id="writable"),
            pytest.param(MetaReadOnlyShippingSerializer, True, id="meta-read-only-fields"),
            pytest.param(DeclaredReadOnlyShippingSerializer, True, id="declared-read-only"),
            pytest.param(GetFieldsReadOnlyShippingSerializer, True, id="get-fields-read-only"),
        ],
    )
    def test_choice_field_reports_static_choices(self, serializer_class, read_only):
        field_data = ModelInfoSerializer().get_model_fields_data(serializer_class)["shipping_method"]

        assert field_data["read_only"] is read_only
        assert field_data["choices"] == SHIPPING_METHOD_CHOICES

    def test_read_only_relation_reports_related_model_without_choices(self):
        field_data = ModelInfoSerializer().get_model_fields_data(MetaReadOnlyShippingSerializer)["customer"]

        assert field_data["read_only"] is True
        assert field_data["choices"] is False
        assert field_data["app_label"] == "store"
        assert field_data["model"] == "customer"
