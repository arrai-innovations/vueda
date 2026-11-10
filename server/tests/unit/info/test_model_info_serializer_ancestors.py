"""
Model-info `model_fields` reports each field's serializer class ancestry in `type_serializer_ancestors`, so a client
can map a project's subclass of a stock serializer field through the stock field's mapping.
"""

import pytest
from rest_framework import serializers

from tests.store.models import Distributor
from tests.store.models import SpecialCare
from tests.store.serializers import ProductSerializer
from vueda.info.serializers import ModelInfoSerializer


class RolesField(serializers.ManyRelatedField):
    """A to-many relation field that only changes which related rows it reads."""


class PickDistributorField(serializers.PrimaryKeyRelatedField):
    pass


class ShoutField(serializers.CharField):
    pass


class LabelMixin:
    """A mixin that is not a serializer field, which the ancestry leaves out."""


class LabelledShoutField(LabelMixin, ShoutField):
    pass


class AncestorsSerializer(ProductSerializer):
    special_care = RolesField(child_relation=serializers.PrimaryKeyRelatedField(queryset=SpecialCare.objects.all()))
    distributor = PickDistributorField(queryset=Distributor.objects.all())
    name = LabelledShoutField()
    distributors = PickDistributorField(source="distributor", many=True, read_only=True)
    shouts = serializers.ListField(child=ShoutField(), required=False, source="internal_comments")
    plain = serializers.ReadOnlyField(source="name")

    class Meta(ProductSerializer.Meta):
        fields = [*ProductSerializer.Meta.fields, "distributors", "shouts", "plain"]


@pytest.fixture
def fields():
    return ModelInfoSerializer().get_model_fields_data(AncestorsSerializer)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("field_name", "expected_type", "expected_ancestors"),
    [
        pytest.param("special_care", "RolesField", ["ManyRelatedField"], id="many-related-field-subclass"),
        pytest.param("distributor", "PickDistributorField", ["PrimaryKeyRelatedField", "RelatedField"], id="related"),
        pytest.param("name", "LabelledShoutField", ["ShoutField", "CharField"], id="skips-non-field-mixin"),
        pytest.param("distributors", "ManyRelatedField", [], id="many-true-subclass-reports-the-wrapper"),
        pytest.param("shouts", "ShoutField", ["CharField"], id="list-field-reports-child-ancestry"),
        pytest.param("plain", "CharField", [], id="reported-type-is-not-the-class"),
        pytest.param("description", "CharField", [], id="stock-field"),
    ],
)
def test_reports_serializer_class_ancestry(fields, field_name, expected_type, expected_ancestors):
    assert fields[field_name]["type_serializer"] == expected_type, fields[field_name]
    assert fields[field_name]["type_serializer_ancestors"] == expected_ancestors, fields[field_name]
