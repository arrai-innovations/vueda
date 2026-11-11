"""
Model-info `model_fields` reports a `MultipleChoiceField` as `many`, because its value is a list of choices. A client
then renders it with the multi-select widget of its `ChoiceField` ancestor.
"""

import pytest
from rest_framework import serializers

from tests.store.serializers import ProductSerializer
from vueda.info.serializers import ModelInfoSerializer


CHOICES = [("a", "A"), ("b", "B")]


class MultipleChoiceSerializer(ProductSerializer):
    tags = serializers.MultipleChoiceField(choices=CHOICES, source="reviews", required=False)
    picks = serializers.MultipleChoiceField(choices=CHOICES, write_only=True, required=False)

    class Meta(ProductSerializer.Meta):
        fields = [*ProductSerializer.Meta.fields, "tags", "picks"]


@pytest.fixture
def fields():
    return ModelInfoSerializer().get_model_fields_data(MultipleChoiceSerializer)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("field_name", "expected_type_model"),
    [
        pytest.param("tags", "CharField", id="array-field-reports-its-base-field"),
        pytest.param("picks", None, id="no-model-field"),
    ],
)
def test_multiple_choice_field_is_many(fields, field_name, expected_type_model):
    field = fields[field_name]
    assert field["many"] is True, field
    assert field["type_model"] == expected_type_model, field
    assert field["type_serializer"] == "MultipleChoiceField", field
    assert field["type_serializer_ancestors"] == ["ChoiceField"], field
    assert field["choices"] == [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}], field
