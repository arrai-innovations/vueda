import drf_writable_nested
import rest_flex_fields.serializers as flex_serializers
from rest_framework.exceptions import ValidationError


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
                if extra_key in errors:
                    errors[extra_key].append("Unexpected field.")
                else:
                    errors[extra_key] = ["Unexpected field."]

            extra_keys_expand = set(self._flex_options_rep_only["expand"]) - set(self.expanded_fields)
            for extra_key in extra_keys_expand:
                if extra_key in errors:
                    errors[extra_key].append("Unexpected field.")
                else:
                    errors[extra_key] = ["Unexpected field."]
            if not self.parent:
                extra_keys_expand = set(self._flex_options_rep_only["expand"]) - set(self.expanded_fields)
                for extra_key in extra_keys_expand:
                    if extra_key in errors:
                        errors[extra_key].append("Unexpected field.")
                    else:
                        errors[extra_key] = ["Unexpected field."]
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
        from ipdb import launch_ipdb_on_exception

        with launch_ipdb_on_exception():
            return super().update_or_create_direct_relations(attrs, relations)


class ExcludeFieldsSerializerMixin:
    """
    Fields hidden or added by this Mixin are not shown in OPTIONS responses.
    https://github.com/encode/django-rest-framework/discussions/8606#discussioncomment-3899252
    """

    def get_extra_kwargs(self):
        kwargs = super().get_extra_kwargs()
        action = self.context["view"].action

        for exclude_actions in ["create", ["update", "partial_update"]]:
            for exclude_action in exclude_actions:
                exclude_for = getattr(self.Meta, f"exclude_{exclude_actions[0]}_fields", None)
                if action == exclude_action and exclude_for:
                    for field in exclude_for:
                        kwargs.setdefault(field, {})
                        kwargs[field]["read_only"] = True
        return kwargs
