import inspect

import drf_writable_nested
import rest_flex_fields.serializers as flex_serializers
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
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
            initial_fields = set()
            for field_name in self.initial_data:
                # Handle data like cart_items[0]quantity.
                if field_name.find("[") != -1:
                    field_name = field_name.split("[")[0]

                # Handle data lik cart_items.quantity
                if "." in field_name:
                    field_name = field_name.split(".")[0]

                initial_fields.add(field_name)
            extra_keys_fields = initial_fields - set(self.fields.keys())
            for extra_key in extra_keys_fields:
                msg = f"Invalid field.  Valid fields are {', '.join(sorted(self.get_fields()))}."
                if extra_key in errors:
                    errors[extra_key].append(msg)
                else:
                    errors[extra_key] = [msg]

            extra_keys_expand = set(self._flex_options_rep_only["expand"]) - set(self._expandable_fields)
            for extra_key in extra_keys_expand:
                msg = f"Invalid expands. Valid expands are {', '.join(sorted(self._expandable_fields))}."
                if extra_key in errors:
                    errors[extra_key].append(msg)
                else:
                    errors[extra_key] = [msg]
        if errors:
            raise ValidationError(errors)
        return attrs


class FlexFieldsWriteableNestedSerializerMixin(
    drf_writable_nested.UniqueFieldsMixin,
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

    def _extract_relations(self, validated_data):
        relations, reverse_relations = super()._extract_relations(validated_data)

        # Tuple, so we can modify inline, as needed.
        for field_name, (_related_field, field, _field_source) in tuple(reverse_relations.items()):
            # You cannot create or update a readonly serializer.
            if isinstance(field, (VuedaReadonlySerializer, VuedaReadonlyListSerializer)):
                del reverse_relations[field_name]

        return relations, reverse_relations

    def update(self, instance, validated_data):
        relations, reverse_relations = self._extract_relations(validated_data)

        # Create or update direct relations (foreign key, one-to-one)
        self.update_or_create_direct_relations(
            validated_data,
            relations,
        )

        # Update instance
        instance = super(drf_writable_nested.NestedUpdateMixin, self).update(
            instance,
            validated_data,
        )
        # should delete first then create, otherwise new created ones will be removed
        self.delete_reverse_relations_if_need(instance, reverse_relations)
        self.update_or_create_reverse_relations(instance, reverse_relations)
        instance.refresh_from_db()
        return instance


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


class VuedaExpandableFieldsSerializerMixin:
    def get_expandable_fields(self):
        from vueda.info.serializers import ModelInfoSerializer

        meta = self.Meta if hasattr(self, "Meta") else None
        expandable_fields = meta.expandable_fields if hasattr(meta, "expandable_fields") else {}

        expands_data = []

        for field_name, field_data in expandable_fields.items():
            expand_item = {
                "name": field_name,
                "read_only": False,
                "many": False,
            }

            # noqa T101 - TODO: We need to do something when the field is a SerializerMethodField, and
            #   get_expandable_fields hasn't been overridden on the serializer to return custom data.
            #   But, would an error here be good, or can it be figured out in a system check?

            # noqa T101 - TODO: Move this into a system check.
            if isinstance(field_data, tuple):  # flex fields only deals with tuples, not lists.
                field_serializer, expand_options = field_data
            else:
                field_serializer = field_data
                expand_options = {}

            # Copied to deal with serializer strings.
            # https://github.com/rsinger86/drf-flex-fields/blob/9dd6a9140fd6d2ffe1baf9ab1ffc728540dea84d/
            #   rest_flex_fields/serializers.py#L127-L130
            if type(field_serializer) == str:  # noqa E721
                field_serializer = self._get_serializer_class_from_lazy_string(field_serializer)

            # noqa T101 - TODO: Move this into a system check.
            if not inspect.isclass(field_serializer):
                raise ValidationError(
                    "This is not a valid `expandable_fields` definition. It must be a tuple of a Serializer/Field"
                    " class and options, or simply a Serializer/Field Class.",
                    {"name": field_name},
                )

            if "many" in expand_options:
                expand_item["many"] = expand_options["many"]

            if issubclass(field_serializer, VuedaReadonlySerializer):
                expand_item["read_only"] = True
            elif "read_only" in expand_options:
                expand_item["read_only"] = expand_options["read_only"]

            if hasattr(field_serializer, "Meta") and hasattr(field_serializer.Meta, "model"):
                field_meta = field_serializer.Meta.model._meta
                expand_item["app_label"] = field_meta.app_label
                expand_item["model"] = field_meta.model_name

                model_content_type = ContentType.objects.get_for_model(field_meta.model)
                serializer = ModelInfoSerializer(model_content_type)
                fields = serializer.get_model_fields_data(field_serializer)

                if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in expand_options:
                    # We need to call tuple, as we are modifying the dictionary.
                    for field_name, field in tuple(fields.items()):
                        if field_name == "pk":  # Always keep the pk.
                            continue
                        if field_name not in expand_options[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]]:
                            del fields[field_name]

                        if "many" not in field:
                            field["many"] = False
                        if "read_only" not in field:
                            field["read_only"] = False
                        if "required" not in field:
                            field["required"] = False
                        if "choices" not in field:
                            field["choices"] = False

                expand_item[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = fields

            expands_data.append(expand_item)

        return expands_data

    def get_model_fields_data(self, serializer):
        return {}

    def get_schema_operation_parameters(self, operation_id, parameters):  # pragma: no cover
        expandable_fields = self.get_schema_expandable_fields()

        enums = set()
        for expandable_field in expandable_fields:
            name = expandable_field["name"]
            enums.add(name)

        if enums:
            parameters.append(
                {
                    "name": settings.REST_FLEX_FIELDS["EXPAND_PARAM"],
                    "required": False,
                    "in": "query",
                    "description": "Replaces simple values with complex, nested serializations.",
                    "schema": {
                        "title": "Expandable Fields",
                        "type": "array of strings",
                        "enum": sorted(enums),
                    },
                }
            )

        return parameters

    def get_schema_expandable_fields(self):  # pragma: no cover
        meta = self.Meta if hasattr(self, "Meta") else None
        expandable_fields = meta.expandable_fields if hasattr(meta, "expandable_fields") else {}

        expands_data = []

        for field_name, field_data in expandable_fields.items():
            expand_item = {
                "name": field_name,
            }

            # noqa T101 - TODO: Do a system check for the expandable fields syntax.
            if isinstance(field_data, tuple):  # flex fields only deals with tuples, not lists.
                field_serializer, expand_options = field_data
            else:
                field_serializer = field_data
                expand_options = {}

            # Copied to deal with serializer strings.
            # https://github.com/rsinger86/drf-flex-fields/blob/9dd6a9140fd6d2ffe1baf9ab1ffc728540dea84d/
            #   rest_flex_fields/serializers.py#L127-L130
            if type(field_serializer) == str:  # noqa E721
                field_serializer = self._get_serializer_class_from_lazy_string(field_serializer)

            if not inspect.isclass(field_serializer):
                raise ValidationError(
                    "This is not a valid `expandable_fields` definition. It must be a tuple of a Serializer/Field"
                    " class and options, or simply a Serializer/Field Class.",
                    {"name": field_name},
                )

            if hasattr(field_serializer, "Meta") and hasattr(field_serializer.Meta, "model"):
                app_label = field_serializer.Meta.model._meta.app_label
                model_name = field_serializer.Meta.model._meta.model_name
                expand_item["app_label"] = app_label
                expand_item["model"] = model_name
                field_data = self.get_model_fields_data(field_serializer)

            if settings.REST_FLEX_FIELDS["FIELDS_PARAM"] in expand_options:
                # We need to call tuple, as we are modifying the dictionary.
                for field_name in tuple(field_data):
                    if field_name == "pk":  # Always keep the pk.
                        continue
                    if field_name not in expand_options[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]]:
                        del field_data[field_name]
            expand_item[settings.REST_FLEX_FIELDS["FIELDS_PARAM"]] = field_data

            expands_data.append(expand_item)

        return expands_data


class VuedaSerializer(
    NoExtraFieldsSerializerMixin,
    VuedaExpandableFieldsSerializerMixin,
    FlexFieldsWriteableNestedSerializerMixin,
    serializers.ModelSerializer,
):
    class Meta:
        expandable_fields = {}
        fields = ["formatted_name"]


class VuedaHistorySerializer(SimpleHistorySerializerMixin, VuedaSerializer):
    class Meta(SimpleHistorySerializerMixin.Meta, VuedaSerializer.Meta):
        expandable_fields = VuedaSerializer.Meta.expandable_fields.copy()
        expandable_fields.update(SimpleHistorySerializerMixin.Meta.expandable_fields)
        fields = VuedaSerializer.Meta.fields + SimpleHistorySerializerMixin.Meta.fields


class VuedaLookupSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        fields = ["code", "name", "formatted_name"] + VuedaSerializer.Meta.fields


# noqa T101 - TODO: Create a test that uses the readonly serializers
class MakeReadonly(serializers.SerializerMetaclass):
    # __new__ is taken from https://stackoverflow.com
    #   /questions/23181442/how-to-hide-remove-some-methods-in-inherited-class-in-python#answer-23182583
    def __new__(cls, cls_name, cls_bases, cls_dict):
        cls_dict.setdefault("__excluded__", ())
        out_cls = super(MakeReadonly, cls).__new__(cls, cls_name, cls_bases, cls_dict)

        def __getattribute__(self, name):  # noqa N807
            if name in cls_dict["__excluded__"]:
                raise AttributeError(name)
            else:
                return super(out_cls, self).__getattribute__(name)

        out_cls.__getattribute__ = __getattribute__

        def __dir__(self):
            return sorted((set(dir(out_cls)) | set(self.__dict__.keys())) - set(cls_dict["__excluded__"]))

        out_cls.__dir__ = __dir__

        return out_cls


class VuedaReadonlyListSerializer(serializers.ListSerializer, metaclass=MakeReadonly):
    __excluded__ = ("create", "update")

    def validate_empty_values(self, data):
        return True, None


class VuedaReadonlySerializer(VuedaSerializer, metaclass=MakeReadonly):
    __excluded__ = ("create", "update")

    class Meta(VuedaSerializer.Meta):
        list_serializer_class = VuedaReadonlyListSerializer

    # Dynamically add all field names to read_only_fields. 2
    # Tried a @property in class meta, but that doesn't work.
    def get_field_names(self, declared_fields, info):
        fields = super().get_field_names(declared_fields, info)

        if not hasattr(self.Meta, "read_only_fields"):
            self.Meta.read_only_fields = fields

        else:
            if not isinstance(self.Meta.read_only_fields, list):
                self.Meta.read_only_fields = list(self.Meta.read_only_fields)

            for field_name in fields:
                if field_name not in self.Meta.read_only_fields:
                    self.Meta.read_only_fields.append(field_name)

        return fields

    def validate_empty_values(self, data):
        return True, None
