from rest_framework import serializers

from tests.product.models import Product
from vueda.core.serializers import VuedaSerializer


class ProductSerializer(VuedaSerializer):
    buzz_words = serializers.ListField(child=serializers.CharField())

    class Meta(VuedaSerializer.Meta):
        model = Product
        fields = ["id", "name", "available_for_sale", "buzz_words"] + VuedaSerializer.Meta.fields
