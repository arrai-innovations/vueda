from rest_framework import serializers

from tests.product.models import Product
from vueda.core.serializers import VuedaHistorySerializer


class ProductSerializer(VuedaHistorySerializer):
    buzz_words = serializers.ListField(child=serializers.CharField())

    class Meta(VuedaHistorySerializer.Meta):
        model = Product
        fields = ["id", "name", "available_for_sale", "buzz_words"] + VuedaHistorySerializer.Meta.fields
