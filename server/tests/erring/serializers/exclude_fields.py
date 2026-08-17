# Serializers exercising ExcludeFieldsSerializerMixin's one valid use (a routed ViewSet's
# serializer_class directly) and the ways it is misused, analogous to
# tests.timesheet.serializers.TimesheetSerializerExclude.
from tests.erring import models as my_models
from vueda.core.serializers import ExcludeFieldsSerializerMixin
from vueda.core.serializers import VuedaSerializer


class ExcludeFieldsSerializer(ExcludeFieldsSerializerMixin, VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = ["id"] + VuedaSerializer.Meta.fields
        exclude_update_fields = ["formatted_name"]
        exclude_create_fields = ["formatted_name"]


class ExcludeFieldsAsNestedFieldSerializer(VuedaSerializer):
    """Misuse: nests ExcludeFieldsSerializer as a declared field, like store.InvoiceSerializer nests
    InvoiceLineSerializer."""

    leaf = ExcludeFieldsSerializer()

    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = ["id", "leaf"] + VuedaSerializer.Meta.fields


class ExcludeFieldsAsExpandableFieldSerializer(VuedaSerializer):
    """Misuse: only reachable through expandable_fields, like store.CustomerSerializer expanding
    UserSerializer."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.RelatedObjectsAreMissingData
        fields = ["id"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "leaf": (ExcludeFieldsSerializer, {}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
