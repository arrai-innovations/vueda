import drf_writable_nested
import rest_flex_fields.serializers as flex_serializers
from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from vueda.history.serializers.mixins import SimpleHistorySerializerMixin


class NoExtraFieldsSerializerMixin:
    """
    Explode on extra fields, but it is not the default behavior of DRF.

    This lets us clean up client code or tests with extraneous keys.
    """

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        if hasattr(self, "initial_data") and self.context.get("view").get_serializer_class() == self.__class__:
            # if the serializer is a nested serializer, we don't want to validate the extra fields
            # because the parent serializer will validate the extra fields.
            extra_keys_fields = set(self.initial_data.keys()) - set(self.fields.keys())
            for extra_key in extra_keys_fields:
                msg = f"Invalid field.  Valid fields are {', '.join(self.get_fields())}."
                if extra_key in errors:
                    errors[extra_key].append(msg)
                else:
                    errors[extra_key] = [msg]

            extra_keys_expand = set(self._flex_options_rep_only["expand"]) - set(self.expanded_fields)
            for extra_key in extra_keys_expand:
                msg = f"Invalid expands.  Valid expands are {', '.join(self._expandable_fields)}."
                if extra_key in errors:
                    errors[extra_key].append(msg)
                else:
                    errors[extra_key] = [msg]
        if errors:
            raise ValidationError(errors)
        return attrs


class FlexFieldsWriteableNestedSerializerMixin(
    flex_serializers.FlexFieldsSerializerMixin,
    drf_writable_nested.NestedCreateMixin,
    drf_writable_nested.NestedUpdateMixin,
):
    """
    This is a utility mixin making a single class that makes serializers flex & nested writable.
    """

    def to_internal_value(self, data):
        """
        We want to apply flex fields to the serializer fields, but only if the
        serializer is being used in a view. We don't want to apply flex fields
        to the serializer fields if the serializer is being used as a nested
        serializer, because it should already have the flex fields applied.
        Double applying flex fields to the serializer fields will cause an error.
        """
        if not self._flex_fields_rep_applied:
            if "view" in self.context and isinstance(self, self.context["view"].get_serializer_class()):
                self.apply_flex_fields(self.fields, self._flex_options_rep_only)
                self._flex_fields_rep_applied = True
        return super().to_internal_value(data)

    def update_or_create_direct_relations(self, attrs, relations):
        return super().update_or_create_direct_relations(attrs, relations)


class ExcludeFieldsSerializerMixin:
    """
    Fields hidden or added by this Mixin are not shown in OPTIONS responses.
    https://github.com/encode/django-rest-framework/discussions/8606#discussioncomment-3899252
    """

    def get_extra_kwargs(self):
        kwargs = super().get_extra_kwargs()
        action = self.context["view"].action
        for exclude_actions in [["create"], ["update", "partial_update"]]:
            for exclude_action in exclude_actions:
                exclude_for = getattr(self.Meta, f"exclude_{exclude_actions[0]}_fields", None)
                if action in exclude_action and exclude_for:
                    for field in exclude_for:
                        kwargs.setdefault(field, {})
                        kwargs[field]["read_only"] = True
        return kwargs


class VuedaSerializer(
    NoExtraFieldsSerializerMixin,
    FlexFieldsWriteableNestedSerializerMixin,
    flex_serializers.FlexFieldsSerializerMixin,
    serializers.ModelSerializer,
):
    class Meta:
        expandable_fields = {}
        expandable_fields_data = {}
        fields = []

    @classmethod
    def populate_expandable_fields_defaults(cls, expandable_fields_data):
        for expandable_field_item in expandable_fields_data.values():
            if "read_only" not in expandable_field_item:
                expandable_field_item["read_only"] = False
            if "many" not in expandable_field_item:
                expandable_field_item["many"] = False
            if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in expandable_field_item:
                for field_name, field in expandable_field_item[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]].items():
                    if field_name == "pk":
                        continue
                    if "many" not in field:
                        field["many"] = False
                    if "read_only" not in field:
                        field["read_only"] = False
                    if "required" not in field:
                        field["required"] = False
                    if "choices" not in field:
                        field["choices"] = False

    @classmethod
    def get_expandable_fields_data(cls):
        """
        Return the expandable fields data off the class.
        Loop through the data and add defaults of False for certain fields if they don't exist.
        """
        expandable_fields_data = cls.Meta.expandable_fields_data

        cls.populate_expandable_fields_defaults(expandable_fields_data)

        return expandable_fields_data


class VuedaHistorySerializer(SimpleHistorySerializerMixin, VuedaSerializer):
    pass
