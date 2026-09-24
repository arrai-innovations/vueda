"""Serializer base classes combining flex-fields, nested writes, and validation."""

__all__ = (
    "EmailSettingsBaseSerializer",
    "ExcludeFieldsSerializerMixin",
    "FlexFieldsWriteableNestedSerializerMixin",
    "GenericForeignKeySerializer",
    "MakeReadonly",
    "NoExtraFieldsSerializerMixin",
    "PrimaryKeyListSerializer",
    "VuedaExpandableFieldsSerializerMixin",
    "VuedaListSerializer",
    "VuedaLookupSerializer",
    "VuedaReadonlyListSerializer",
    "VuedaReadonlySerializer",
    "VuedaSerializer",
    "ensure_flex_fields_applied",
)

import copy
import inspect
from collections.abc import Mapping
from typing import ClassVar

import drf_writable_nested
import rest_flex_fields.serializers as flex_serializers
from django.conf import settings
from django.db.models import CompositePrimaryKey
from django.db.models import FileField as ModelFileField
from django.db.models import ImageField as ModelImageField
from rest_flex_fields import split_levels
from rest_framework import serializers

from vueda.core.exceptions import VuedaValidationError
from vueda.core.fields.serializers import FileField as VuedaFileField
from vueda.core.fields.serializers import ImageField as VuedaImageField
from vueda.core.formatted_name import annotate_formatted_name
from vueda.core.serializers.fields import AvailableActionsField
from vueda.core.serializers.fields import CompositePrimaryKeyField
from vueda.core.serializers.fields import TemplatedTextField
from vueda.core.serializers.fields import TemplateTagsDataField
from vueda.history.revision import REVISION_ANNOTATION
from vueda.history.revision import ObjectRevisionField
from vueda.history.revision import annotate_object_revision
from vueda.history.revision import is_tracked
from vueda.info.registration import get_serializer_for_model


class PrimaryKeyListSerializer(serializers.Serializer):
    """Validates a ``pks`` body field containing a non-empty list of integer primary keys."""

    pks = serializers.ListField(
        child=serializers.IntegerField(error_messages={"invalid": "Primary keys must be valid integers."}),
        allow_empty=False,
        error_messages={
            "not_a_list": "pks must be a list of primary keys.",
            "empty": "pks list cannot be empty.",
        },
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


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

                # Handle data like cart_items.quantity
                if "." in field_name:
                    field_name = field_name.split(".")[0]

                initial_fields.add(field_name)

            # formatted_name is a virtual, model-computed field. It's always a valid field to send
            # back, even when FIELDS_PARAM has restricted self.fields down to a set that excludes it.
            valid_fields = set(self.fields.keys())
            if hasattr(getattr(self, "Meta", None), "model") and self.Meta.model._has_formatted_name_field():
                valid_fields.add("formatted_name")

            extra_keys_fields = initial_fields - valid_fields
            for extra_key in extra_keys_fields:
                msg = f"Invalid field.  Valid fields are {', '.join(sorted(valid_fields))}."
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
            raise VuedaValidationError(errors)
        return attrs


def ensure_flex_fields_applied(serializer):
    """
    Apply the request's query-param-driven expand/fields/omit resolution (``_flex_options_rep_only``)
    to ``serializer.fields``. ``rest_flex_fields`` only applies this resolution automatically inside
    ``to_representation()``; merely accessing ``.fields`` does not, because the ``get_fields()`` that
    triggers applies a separate, constructor-kwarg-driven options set (``_flex_options_base``)
    instead, which is empty for a serializer built the normal way from a request.

    Needed by a caller that must inspect the resolved field tree -- which fields a request's ``?e=``
    actually turned into nested serializers -- without first serializing an instance, such as a
    queryset's prefetch plan (``vueda.core.viewsets.build_prefetch_plan``).

    A no-op if this serializer instance already applied it, whether by a prior call here or by
    ``to_representation`` itself, so calling this before a representation happens does not double
    the expansion work or clobber ``fields`` that expansion already added to.
    """
    if not serializer._flex_fields_rep_applied:
        serializer.apply_flex_fields(serializer.fields, serializer._flex_options_rep_only)
        serializer._flex_fields_rep_applied = True


class FlexFieldsWriteableNestedSerializerMixin(
    drf_writable_nested.UniqueFieldsMixin,
    flex_serializers.FlexFieldsSerializerMixin,
    drf_writable_nested.NestedCreateMixin,
    drf_writable_nested.NestedUpdateMixin,
):
    """
    This is a utility mixin making a single class that makes serializers flex & nested writable.
    """

    def apply_flex_fields(self, fields, flex_options):
        expand_fields, _next_expand_fields = split_levels(flex_options["expand"])
        sparse_fields, next_sparse_fields = split_levels(flex_options["fields"])

        if self._contains_wildcard_value(expand_fields):
            expand_fields = self._expandable_fields.keys()

        added_wildcard_expands = False
        for expand_field in expand_fields:
            if expand_field not in next_sparse_fields:
                flex_options["fields"].append(f"{expand_field}.*")
                added_wildcard_expands = True

        # If no fields were specified (which can occur through tests) and we added
        # expanded field wildcards, then we also need all fields from the main model.
        if added_wildcard_expands and not sparse_fields:
            flex_options["fields"].append("*")

        return super().apply_flex_fields(fields, flex_options)

    def to_representation(self, instance):
        """
        ``?f=``/``?om=`` (``_flex_options_rep_only``, sourced from query params) narrow the
        representation only. Applying them here, rather than in ``to_internal_value``, keeps a
        write validating against the serializer's full field set while still narrowing the
        response a write returns, since ``to_representation`` runs after ``save()``.

        ``fields=``/``omit=`` passed as serializer kwargs (``_flex_options_base``) are a
        different entry point: ``get_fields()`` applies them before either
        ``to_internal_value`` or ``to_representation`` runs, so they narrow validation and
        representation alike. That is unchanged and deliberate -- a caller constructing a
        serializer with explicit kwargs is opting in to restricting both directions, unlike a
        client shaping a response with a query parameter.

        Delegates the view-bound check and the actual application to
        ``ensure_flex_fields_applied``, the same helper a caller like
        ``VuedaViewSet.get_queryset`` uses to resolve ``.fields`` before an instance is ever
        serialized (for prefetch planning). Both call sites must agree on when application is
        safe and on the ``_flex_fields_rep_applied`` double-application guard, so that logic
        lives in one place rather than two copies that could drift.
        """
        if "view" in self.context and isinstance(self, self.context["view"].get_serializer_class()):
            ensure_flex_fields_applied(self)
        return super().to_representation(instance)

    def to_internal_value(self, data):
        """
        ``?e=`` (expand) names relations whose payload is a nested object rather than a flat
        PK, so each expanded relation is swapped for its nested serializer here, before
        deserialization, to accept that shape. See the nested-writable-inlines guide for the
        query-param contract; this half of flex-field handling is independent of sparse-fieldset
        narrowing and stays on the write path.

        ``?f=``/``?om=`` are not applied here. They narrow the representation only, in
        ``to_representation`` (via ``ensure_flex_fields_applied``), so a required field they
        exclude still fails validation instead of silently losing its validator. Deserialization
        must not call ``ensure_flex_fields_applied`` for this reason: that helper runs the full
        ``apply_flex_fields``, sparse-fieldset removal included, which is exactly what would
        drop the validator.
        """
        if "view" in self.context and isinstance(self, self.context["view"].get_serializer_class()):
            self._expand_fields_for_write(self.fields, self._flex_options_rep_only)

        # Django REST Framework does not automatically pass `initial_data` to nested serializers.
        # Some nested serializers may need access to `initial_data` for validation,
        # so this loop explicitly assigns it to ensure it is available.
        initial_data = self.get_initial()
        for field_name, field in self.fields.items():
            if isinstance(field, serializers.BaseSerializer) and field_name in initial_data:
                field.initial_data = initial_data[field_name]
        return super().to_internal_value(data)

    def _expand_fields_for_write(self, fields, flex_options):
        """
        Swap each ``?e=`` relation for its nested serializer, the expand half of
        ``apply_flex_fields``, without its sparse-fieldset removal -- a write validates every
        field regardless of ``?f=``/``?om=``, so removal has no place on this path. Nested
        ``?f=``/``?om=`` selectors for the expanded relation (e.g. ``f=employee.name``) are not
        passed down either, for the same reason: they must not narrow the nested serializer's
        own validation. ``to_representation`` re-swaps the relation with a fresh nested
        serializer that does carry them, for the response.
        """
        expand_fields, next_expand_fields = split_levels(flex_options["expand"])
        if self._contains_wildcard_value(expand_fields):
            expand_fields = self._expandable_fields.keys()

        for name in expand_fields:
            if name in self._expandable_fields:
                fields[name] = self._make_expanded_field_serializer(name, next_expand_fields, {}, {})

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
            # Membership in the action list, not containment in one action's name: an extra action named
            # "partial" is not a partial_update, and must not inherit its exclusions.
            exclude_for = getattr(self.Meta, f"exclude_{exclude_actions[0]}_fields", None)
            if action in exclude_actions and exclude_for:
                for field in exclude_for:
                    kwargs.setdefault(field, {})
                    kwargs[field]["read_only"] = True
        return kwargs


class VuedaExpandableFieldsSerializerMixin:
    """
    Serializer mixin that builds structured metadata about expandable fields for the
    ``/info/`` meta-API and OpenAPI schema. Automatically omits ``available_actions``
    from nested expand representations.
    """

    field_display_choices: ClassVar[dict] = {}

    def _get_expanded_field_names(
        self,
        expand_fields: list[str],
        omit_fields: list[str],
        sparse_fields: list[str],
        next_level_omits: dict[str, list[str]],  # rest_flex_fields says this is List[str], but it's a dictionary.
    ) -> list[str]:
        for field_name in expand_fields:
            if field_name not in next_level_omits:
                next_level_omits[field_name] = []
            if "available_actions" not in next_level_omits[field_name]:
                next_level_omits[field_name].append("available_actions")

        return super()._get_expanded_field_names(expand_fields, omit_fields, sparse_fields, next_level_omits)

    def generate_expand_model_info(self) -> list:
        """
        Build the base list of expand descriptors for the ``/info/`` meta-API from
        ``Meta.expandable_fields``. This is the internal generation step; serializers that need to
        customize the final expand metadata should override ``get_expand_model_info`` instead.
        """
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

            # For ways that bypass system checks, validate that this is a class.
            if not inspect.isclass(field_serializer):
                raise VuedaValidationError(
                    "This is not a valid `expandable_fields` definition. It must be a tuple of a Serializer/Field"
                    " class and options, or simply a Serializer/Field Class.",
                    {"name": field_name},
                )

            if "many" in expand_options:
                expand_item["many"] = expand_options["many"]

            if issubclass(field_serializer, (GenericForeignKeySerializer, VuedaReadonlySerializer)):
                expand_item["read_only"] = True
            elif "read_only" in expand_options:
                expand_item["read_only"] = expand_options["read_only"]

            if hasattr(field_serializer, "Meta") and hasattr(field_serializer.Meta, "model"):
                field_meta = field_serializer.Meta.model._meta
                expand_item["app_label"] = field_meta.app_label
                expand_item["model"] = field_meta.model_name

                # Expandable fields don't need available actions.
                fields = ModelInfoSerializer().get_model_fields_data(
                    field_serializer, excluded_fields={"available_actions"}
                )

                # Mirror ModelInfoSerializer.get_model_fields: this expand's own nested serializer may
                # correct its generated field metadata (e.g. for a SerializerMethodField), and that
                # correction must be applied here too, not just when the nested serializer is used as
                # a root canonical serializer.
                get_field_model_info = getattr(field_serializer(), "get_field_model_info", None)
                if get_field_model_info is not None:
                    fields = get_field_model_info(fields)

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

    def get_expand_model_info(self, expands):
        """
        Customization hook for the ``model_expands`` metadata the ``/info/`` meta-API returns for this
        serializer. Receives the generated list of expand descriptors and must return a list in the same
        shape; override to add or adjust entries, such as the real type of a ``SerializerMethodField``.
        The default implementation returns ``expands`` unchanged.
        """
        return expands

    def get_field_model_info(self, fields):
        """
        Customization hook for the ``model_fields`` metadata the ``/info/`` meta-API returns for this
        serializer. Receives the generated field metadata dict (keyed by field name) and must return a
        dict in the same shape; override to correct or add entries, such as the real type of a
        ``SerializerMethodField``. The default implementation applies ``field_display_choices``.
        """
        for field_name, choices in self.get_field_display_choices().items():
            if field_name in fields:
                fields[field_name]["display_choices"] = self.serialize_display_choices(choices)
        return fields

    def get_field_display_choices(self):
        """
        Return display-only label mappings for serializer fields.

        ``field_display_choices`` should be keyed by serializer field name. Each value may be either a
        mapping of ``{stored_value: label}``, an iterable of ``(stored_value, label)`` pairs, or an
        iterable of objects with ``value`` and ``label`` keys. These labels affect read-only display
        metadata only; they do not change validation choices or editable widgets.
        """
        return self.field_display_choices

    @staticmethod
    def serialize_display_choices(choices):
        """Return model-info ``display_choices`` entries from a display-choice declaration."""
        if isinstance(choices, Mapping):
            choices = choices.items()

        choice_data = []
        for choice in choices:
            if isinstance(choice, Mapping):
                value = choice["value"]
                label = choice["label"]
            else:
                value, label = choice
            choice_data.append({"label": label, "value": value})

        return choice_data

    def get_schema_operation_parameters(self, operation_id, parameters):
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
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": sorted(enums),
                        },
                    },
                }
            )

        schema_fields = self.get_schema_fields()

        if schema_fields:
            parameters.append(
                {
                    "name": settings.REST_FLEX_FIELDS["FIELDS_PARAM"],
                    "required": False,
                    "in": "query",
                    "description": "Selects a sparse subset of fields to include in the response.",
                    "schema": {
                        "title": "Sparse Fields",
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": sorted(schema_fields),
                        },
                    },
                }
            )

        return parameters

    @staticmethod
    def _reduce_field_model_info_for_schema(original_expands_data):
        """
        Reduce ``model_fields``/``model_expands``-shaped metadata (as produced by ``generate_expand_model_info``/
        ``ModelInfoSerializer.get_model_fields_data`` and corrected by ``get_expand_model_info``/
        ``get_field_model_info``) to what an OpenAPI schema needs: a label, the DRF field type (renamed from
        ``type_serializer`` to ``type``), whether the value is required, and its choices. Drops the database/model
        type detail (``type_db``/``type_model``), the ``many``/``read_only`` flags, the ``hidden`` and ``list_default``
        flags, help text, and constraint bookkeeping (``max_value``, ``min_value``, ``max_length``, ``min_length``,
        ``max_digits``, ``decimal_places``, ``pk``) that ``/info/`` also reports but the schema does not need.

        Handles three shapes: a flat ``model_fields``-style dict keyed by field name (from ``get_schema_fields``);
        a list of ``model_expands``-style descriptors with nested per-field metadata under the
        ``FIELDS_PARAM`` key (a related-model-backed expand); and a list of descriptors with no nested fields
        (a ``SerializerMethodField``-backed expand with no related model), whose own type metadata sits directly
        on the descriptor instead of under ``FIELDS_PARAM``. The reduction applies to the descriptor itself as
        well as to any nested fields, so a descriptor's own ``many``/``read_only``/type keys are reduced too.
        """

        drop_keys = (
            "type_db",
            "type_model",
            "many",
            "read_only",
            "hidden",
            "list_default",
            "help_text",
            "max_value",
            "min_value",
            "max_length",
            "min_length",
            "max_digits",
            "decimal_places",
            "pk",
            "display_choices",
        )

        def update_data(field_data):
            for key in drop_keys:
                field_data.pop(key, None)
            if "type_serializer" in field_data:
                if "type" not in field_data:
                    field_data["type"] = field_data["type_serializer"]
                del field_data["type_serializer"]

        if isinstance(original_expands_data, dict):
            expands_data = original_expands_data.values()
        else:
            expands_data = original_expands_data

        for expand_item in expands_data:
            if not isinstance(expand_item, dict):
                continue
            fields_param = expand_item.get(settings.REST_FLEX_FIELDS["FIELDS_PARAM"])
            if isinstance(fields_param, dict):
                for field_data in fields_param.values():
                    update_data(field_data)
            update_data(expand_item)

        return original_expands_data

    def get_schema_expandable_fields(self):
        """
        Build the ``expand`` query parameter's documented values for the OpenAPI schema, reusing the same
        generation (``generate_expand_model_info``) and customization hook (``get_expand_model_info``) the
        ``/info/`` meta-API uses for ``model_expands``, then reducing the result to what the schema needs.
        """
        expands_data = self.generate_expand_model_info()
        expands_data = self.get_expand_model_info(expands_data)
        return self._reduce_field_model_info_for_schema(expands_data)

    def get_schema_fields(self):
        """
        Build this serializer's own field metadata for OpenAPI schema purposes, mirroring how ``model_fields``
        is generated for the ``/info/`` meta-API: inspect the serializer's own fields with
        ``ModelInfoSerializer.get_model_fields_data``, then run the result through ``get_field_model_info`` so
        a serializer that already corrects a ``SerializerMethodField``'s metadata for ``/info/`` gets the same
        correction reflected in its schema, then reduce to the keys the schema needs. Returns an empty dict when
        this serializer has no ``Meta.model`` to inspect.

        Passes ``self.context`` along so ``get_model_fields_data`` re-instantiates this *same* serializer
        class with the view already in context (rather than bare) -- this is describing this serializer's
        own fields, not another serializer's, so reusing ``self``'s context here is always correct.
        """
        from vueda.info.serializers import ModelInfoSerializer

        meta = self.Meta if hasattr(self, "Meta") else None
        model = meta.model if hasattr(meta, "model") else None

        if model is None:
            return {}

        fields = ModelInfoSerializer().get_model_fields_data(self.__class__, context=self.context)
        fields = self.get_field_model_info(fields)

        return self._reduce_field_model_info_for_schema(fields)


class FormattedNameSerializerMixin:
    def get_formatted_name(self, obj):
        return obj._get_formatted_name()


class VuedaListSerializer(serializers.ListSerializer):
    """
    List serializer for ``VuedaSerializer`` subclasses. Annotates the queryset with
    ``formatted_name`` when the child serializer's model has ``formatted_name_lookup_expression``,
    mirroring the annotation that ``VuedaViewSet.get_queryset()`` applies for direct requests.
    This ensures ``formatted_name`` is populated even when objects are fetched via a related
    manager during expand (which bypasses the viewset queryset).

    The annotate is skipped when ``formatted_name`` is already present in the queryset's
    annotations -- not only to avoid redundant work, but because annotating a queryset that is
    serving a prefetched relation clones it, discarding the cached prefetch result and forcing a
    fresh query per row. ``vueda.core.viewsets.build_prefetch_plan`` pre-annotates a to-many
    expand's ``Prefetch`` queryset for exactly this reason, so this check finds it already done.
    """

    def to_representation(self, data):
        child_model = getattr(getattr(self.child, "Meta", None), "model", None)
        if child_model:
            # A relation arrives as its manager. Resolve it the way the parent does, because a
            # manager reports no annotations and no result cache, so every check below would say
            # "not yet done" and annotate a prefetched relation into a fresh query per row.
            if hasattr(data, "all"):
                data = data.all()
            if hasattr(data, "annotate"):
                existing = getattr(getattr(data, "query", None), "annotations", {})
                # Annotating a queryset that has already run clones it and discards the prefetch
                # cache. A relation the project prefetched itself arrives that way, so leave it be;
                # its rows publish no revision.
                already_fetched = getattr(data, "_result_cache", None) is not None
                if not already_fetched:
                    if "formatted_name" not in existing:
                        data = annotate_formatted_name(data)
                    if REVISION_ANNOTATION not in existing:
                        data = annotate_object_revision(data)
        return super().to_representation(data)


class VuedaSerializer(
    NoExtraFieldsSerializerMixin,
    VuedaExpandableFieldsSerializerMixin,
    FlexFieldsWriteableNestedSerializerMixin,
    FormattedNameSerializerMixin,
    serializers.ModelSerializer,
):
    """
    Standard serializer base for all VUEDA models. Combines extra-field rejection,
    flex-fields expansion, writable nested relations, and an ``available_actions``
    field that exposes permitted actions for the current user.
    """

    available_actions = AvailableActionsField()
    formatted_name = serializers.ReadOnlyField(style={"hidden": True})
    object_revision = ObjectRevisionField()

    def get_fields(self):
        fields = super().get_fields()
        model = getattr(getattr(self, "Meta", None), "model", None)
        if model is not None and not is_tracked(model):
            # An opted-out model publishes no revision, because it records nothing to revise.
            fields.pop("object_revision", None)
        return fields

    def _reload_with_revision(self, instance):
        """Re-read a written row so its revision annotation is present.

        A create or update returns the instance the write produced, which carries no annotation.
        The nested writable path reuses one serializer class for parent and child, so the view's
        queryset may belong to a different model than the instance; fall back to the instance's own
        manager in that case.
        """
        if not is_tracked(type(instance)):
            return instance
        model = type(instance)
        view = self.context.get("view")
        view_queryset = view.get_queryset() if view is not None else None
        queryset = view_queryset if view_queryset is not None and view_queryset.model is model else None
        if queryset is None:
            queryset = annotate_object_revision(model._default_manager.all())
        reloaded = queryset.filter(pk=instance.pk).first()
        return reloaded if reloaded is not None else instance

    def create(self, validated_data):
        return self._reload_with_revision(super().create(validated_data))

    def update(self, instance, validated_data):
        return self._reload_with_revision(super().update(instance, validated_data))

    def get_warnings(self):
        """
        Return advisory warnings for the current create/update as a mapping of
        ``{field_name: [messages], "non_field_errors": [messages]}``. An empty mapping means no
        warnings.

        Override to surface non-blocking concerns the user should confirm before the write commits
        (for example, "this will deactivate the last administrator"). This is called by the viewset
        after validation succeeds, so ``self.validated_data`` is populated and ``self.instance`` holds
        the current (pre-save) instance on updates. It must not raise: blocking conditions belong in
        ``validate``/``VuedaValidationError`` (which return 400), whereas warnings gate the save behind
        an explicit client confirmation (see ``WarningConfirmationMixin``).
        """
        return {}

    def to_representation(self, instance):
        """
        Drops ``available_actions`` from ``self.fields`` before rendering when a client hasn't
        named it through ``?f=``, rather than computing it and discarding the result afterward.
        Unlike an ordinary field, ``available_actions`` is not part of the default response -- a
        client must ask for it explicitly -- and computing it runs a permission check per CRUD
        action and per extra action, so a response that will drop it anyway must not pay for it.
        """
        sparse_fields, _ = split_levels(self._flex_options_all["fields"])
        if "available_actions" not in sparse_fields:
            self.fields.pop("available_actions", None)
        return super().to_representation(instance)

    serializer_field_mapping: ClassVar[dict] = {
        **serializers.ModelSerializer.serializer_field_mapping,
        CompositePrimaryKey: CompositePrimaryKeyField,
        # Route file and image columns through VUEDA's serializer fields so they emit the
        # {"name": ..., "url": ...} representation the client widgets consume. ImageField is keyed
        # explicitly (not just inherited via FileField) so ClassLookupDict resolves it before FileField.
        ModelFileField: VuedaFileField,
        ModelImageField: VuedaImageField,
    }

    class Meta:
        expandable_fields = {}
        fields = ["formatted_name", "available_actions", "object_revision"]
        list_serializer_class = VuedaListSerializer


class VuedaLookupSerializer(VuedaSerializer):
    """``VuedaSerializer`` pre-configured for ``Lookup`` subclasses with ``id``, ``code``, and ``name`` fields."""

    class Meta(VuedaSerializer.Meta):
        fields = ["id", "code", "name", "formatted_name"] + VuedaSerializer.Meta.fields


class MakeReadonly(serializers.SerializerMetaclass):
    """
    Metaclass that hides ``create`` and ``update`` on any serializer class it is applied to.
    Used internally by ``VuedaReadonlySerializer`` and ``VuedaReadonlyListSerializer``.
    """

    # __new__ is taken from https://stackoverflow.com
    #   /questions/23181442/how-to-hide-remove-some-methods-in-inherited-class-in-python#answer-23182583
    def __new__(cls, cls_name, cls_bases, cls_dict):
        cls_dict.setdefault("__excluded__", ())
        out_cls = super().__new__(cls, cls_name, cls_bases, cls_dict)

        def __getattribute__(self, name):  # noqa N807
            if name in cls_dict["__excluded__"]:
                raise AttributeError(name)
            else:
                return super(out_cls, self).__getattribute__(name)

        out_cls.__getattribute__ = __getattribute__

        def __dir__(self):  # noqa N807
            return sorted((set(dir(out_cls)) | set(self.__dict__.keys())) - set(cls_dict["__excluded__"]))

        out_cls.__dir__ = __dir__

        return out_cls


class VuedaReadonlyListSerializer(VuedaListSerializer, metaclass=MakeReadonly):
    """List serializer that disables ``create`` and ``update``. Used as the list class for ``VuedaReadonlySerializer``."""

    __excluded__ = ("create", "update")

    def validate_empty_values(self, data):
        # An empty list, not None: ListSerializer.save() iterates validated_data before ever
        # reaching self.update/self.create, so None would raise TypeError instead of the
        # intended AttributeError from the hidden methods.
        return True, []


class VuedaReadonlySerializer(VuedaSerializer, metaclass=MakeReadonly):
    """
    Read-only variant of ``VuedaSerializer``. Disables ``create`` and ``update``,
    and marks all fields as read-only. Use for nested expansions that must not be
    written through the parent serializer.
    """

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
        # An empty dict, not None: Serializer.save() unpacks validated_data before ever
        # reaching self.update/self.create, so None would raise TypeError instead of the
        # intended AttributeError from the hidden methods.
        return True, {}


class EmailSettingsBaseSerializer(VuedaSerializer):
    """
    Serializer base for ``EmailTemplateBase`` subclasses. Uses ``TemplatedTextField``
    for subject and body (supports Django template syntax) and ``TemplateTagsDataField``
    for the preview legend.
    """

    subject = TemplatedTextField()
    body = TemplatedTextField()
    preview_tag_data = TemplateTagsDataField(label="Legend")

    class Meta(VuedaSerializer.Meta):
        fields = [
            "id",
            "subject",
            "body",
            "from_email",
            "bcc_email",
            "preview_tag_data",
        ]


def _parse_model_targeted_field(field_name: str) -> tuple[str, str, str] | None:
    """Parse a model-targeted field specifier like ``_store__distributor__description``.

    Returns ``(app_label, model_name, field)`` for a well-formed specifier, or ``None``
    for regular field names or malformed specifiers.

    Syntax: leading ``_`` followed by ``app_label``, ``model_name``, and ``field_name``
    separated by ``__``.  Single underscores within any component are allowed (e.g.
    ``_my_app__my_model__first_name``); double underscores are not, which matches
    Django's own restriction on field names.
    """
    if not field_name.startswith("_") or field_name.startswith("__"):
        return None
    parts = field_name[1:].split("__")
    if len(parts) != 3 or not all(parts):  # noqa: PLR2004
        return None
    return parts[0], parts[1], parts[2]


class GenericForeignKeySerializer(flex_serializers.FlexFieldsSerializerMixin, serializers.Serializer):
    """Serializer for GenericForeignKey expand fields.

    Dynamically serializes the related object's concrete fields at to_representation
    time, since the related model is unknown until then. Supports flex field filtering
    (fields/omit) via rest_flex_fields options passed through expandable_fields.

    The instance is not available at get_fields() time — for nested serializers DRF
    passes the related value directly to to_representation(), never setting self.instance.
    All dynamic field logic therefore lives in to_representation().

    Always includes app_label, model, and formatted_name in the output regardless of
    field filtering.

    Model-targeted field specifiers (``_applabel__modelname__field``) may be used in
    the ``FIELDS_PARAM`` and ``OMIT_PARAM`` lists inside ``expandable_fields`` to apply
    filtering only when the related object is an instance of the named model.  Plain
    field names and wildcards apply to every related model type.  If no static filtering
    is needed, ``GenericForeignKeySerializer`` may be declared as a bare class without
    options.
    """

    def get_fields(self):
        # Fields are dynamic — resolved from the related instance in to_representation.
        return {}

    def to_representation(self, instance):
        if instance is None:
            return None

        serializer_class = get_serializer_for_model(type(instance))
        if serializer_class is None:
            return None

        # Flex options are lost when serializers are created, so we need to get the raw expandable data and process it.
        field_options = self.parent._expandable_fields.get(self.field_name, ())
        if isinstance(field_options, tuple):
            serializer_settings = copy.deepcopy(field_options[1]) if len(field_options) > 1 else {}
        else:
            serializer_settings = {}

        fields_param = settings.REST_FLEX_FIELDS["FIELDS_PARAM"]
        omit_param = settings.REST_FLEX_FIELDS["OMIT_PARAM"]

        # Resolve model-targeted field specifiers for the concrete instance type first, so the static
        # declaration is in its final per-model form before we apply request-time selections on top.
        # Specifiers matching the current model are replaced with their bare field name;
        # specifiers targeting a different model are dropped.  Plain field names and
        # wildcards pass through unchanged.
        meta = instance._meta
        for param in (fields_param, omit_param):
            if param in serializer_settings:
                resolved = []
                for field in serializer_settings[param]:
                    parsed = _parse_model_targeted_field(field)
                    if parsed is None:
                        resolved.append(field)
                    elif parsed[0] == meta.app_label and parsed[1] == meta.model_name:
                        resolved.append(parsed[2])
                serializer_settings[param] = resolved

        # Apply request-time field/omit selections (stored by flex-fields on self._flex_options_all).
        # Runtime selections further restrict the static declaration — they cannot expand it:
        # - fields: intersect with static (runtime can only narrow, not widen the allowed set)
        # - omit: union with static (both sets of exclusions apply)
        runtime_fields = self._flex_options_all["fields"]
        runtime_omit = self._flex_options_all["omit"]

        # runtime_fields will always be at least '*'.
        static_fields = serializer_settings.get(fields_param, [])
        if not static_fields:
            serializer_settings[fields_param] = list(runtime_fields)
        elif "*" in static_fields:
            # Static allows all fields for this model; runtime narrows the set.
            serializer_settings[fields_param] = list(runtime_fields)
        elif "*" not in runtime_fields:
            # Both sides are explicit: keep only fields the static declaration permits.
            static_set = set(static_fields)
            serializer_settings[fields_param] = [f for f in runtime_fields if f in static_set]
        # else: runtime is a wildcard — the static restriction is already tighter; no change.

        # runtime_omits will always be at least 'available_actions' because of
        # 'VuedaExpandableFieldsSerializerMixin' > '_get_expanded_field_names'.
        static_omit = serializer_settings.get(omit_param, [])
        extra = [f for f in runtime_omit if f not in static_omit]
        if extra:
            serializer_settings[omit_param] = static_omit + extra

        serializer_settings["context"] = self.context
        serializer_settings["instance"] = instance

        serializer = serializer_class(**serializer_settings)
        results = serializer.data

        # Always include GFK identity metadata regardless of field filtering.
        results["app_label"] = meta.app_label
        results["model"] = meta.model_name
        if "formatted_name" not in results or results["formatted_name"] is None:
            results["formatted_name"] = instance._get_formatted_name()

        return results
