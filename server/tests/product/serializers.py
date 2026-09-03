from rest_framework import serializers

from tests.product.models import Product
from vueda.history.serializers import VuedaHistorySerializer


class ProductSerializer(VuedaHistorySerializer):
    buzz_words = serializers.ListField(child=serializers.CharField())

    class Meta(VuedaHistorySerializer.Meta):
        model = Product
        fields = ["id", "name", "available_for_sale", "buzz_words"] + VuedaHistorySerializer.Meta.fields


class ProductRenamedFieldSerializer(ProductSerializer):
    """Exposes Product.name under the serializer field name `title`, so tests can tell whether ordering
    resolves against the model's own field names or the serializer's."""

    title = serializers.CharField()

    class Meta(ProductSerializer.Meta):
        fields = ["id", "title", "available_for_sale", "buzz_words"] + VuedaHistorySerializer.Meta.fields


class ProductSourceFieldSerializer(ProductSerializer):
    """Exposes Product.name under the serializer field name `title` via an explicit `source="name"`,
    with no matching queryset annotation, so tests can tell whether ordering resolves against a
    serializer field's exposed name or its underlying source."""

    title = serializers.CharField(source="name")

    class Meta(ProductSerializer.Meta):
        fields = ["id", "title", "available_for_sale", "buzz_words"] + VuedaHistorySerializer.Meta.fields


class ProductPropertyFieldSerializer(ProductSerializer):
    """Exposes the Product.computed_title model property under the serializer field name `title`, so
    tests can tell whether ordering resolves against a serializer field sourced from a model property."""

    title = serializers.CharField(source="computed_title")

    class Meta(ProductSerializer.Meta):
        fields = ["id", "title", "available_for_sale", "buzz_words"] + VuedaHistorySerializer.Meta.fields
