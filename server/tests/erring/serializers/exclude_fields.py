# Serializers exercising ExcludeFieldsSerializerMixin as a routed ViewSet's serializer_class and in the
# placements the system check rejects (a nested field, an expandable field), analogous to
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


class ExcludeFieldsReadingOwnFieldsSerializer(ExcludeFieldsSerializerMixin, VuedaSerializer):
    """A get_field_model_info override that builds this serializer's fields. /info/ calls the override on
    an instance created without a context."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = ["id"] + VuedaSerializer.Meta.fields
        exclude_update_fields = ["formatted_name"]
        exclude_create_fields = ["formatted_name"]

    def get_field_model_info(self, fields):
        fields = super().get_field_model_info(fields)
        if self.fields["id"].read_only:
            fields["id"]["label"] = "Identifier"
        return fields


class ExcludeFieldsAsNestedFieldSerializer(VuedaSerializer):
    """Misuse: nests ExcludeFieldsSerializer as a declared field, like store.InvoiceSerializer nests
    InvoiceLineSerializer."""

    leaf = ExcludeFieldsSerializer()

    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = ["id", "leaf"] + VuedaSerializer.Meta.fields


class ExcludeFieldsAsExpandableFieldSerializer(VuedaSerializer):
    """Misuse: only reachable through expandable_fields, like store.CustomerSerializer expanding
    UserSerializer."""

    class Meta(VuedaSerializer.Meta):
        model = my_models.NoExpandableFieldsData
        fields = ["id"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "leaf": (ExcludeFieldsSerializer, {}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
