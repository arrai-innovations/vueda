from tests.bulk_actions import models
from vueda.core.serializers import VuedaSerializer


class IntegerKeyGadgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.IntegerKeyGadget
        fields = ["id", "name", "locked", "is_active"] + VuedaSerializer.Meta.fields


class UUIDKeyGadgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.UUIDKeyGadget
        fields = ["id", "name", "is_active"] + VuedaSerializer.Meta.fields


class StringKeyGadgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.StringKeyGadget
        fields = ["code", "name", "is_active"] + VuedaSerializer.Meta.fields


class CompositeKeyGadgetSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.CompositeKeyGadget
        fields = ["pk", "batch", "number", "name", "is_active"] + VuedaSerializer.Meta.fields
