import pytest

from tests.erring import serializers as err_serializers
from vueda import info


@pytest.mark.django_db
class TestExpandableFieldsChecks:
    def test_list_value_system_check_error(self):
        """ExpandableFieldsListSerializer uses a list instead of a tuple; check must flag it as E001."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ExpandableFieldsListSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsListSerializer.Meta.expandable_fields['no_name'] is a list.",
                hint="flex-fields only supports tuples for expandable_fields values, not lists.",
                obj=err_serializers.ExpandableFieldsListSerializer,
                id="vueda_core.E001",
            )
        ]

    def test_bad_tuple_length_system_check_error(self):
        """ExpandableFieldsBadTupleLengthSerializer has a 3-tuple; check must flag it as E002."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ExpandableFieldsBadTupleLengthSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsBadTupleLengthSerializer.Meta.expandable_fields['no_name'] is a 3-tuple.",
                hint="A tuple value must be exactly (Serializer/Field class or lazy string, options dict).",
                obj=err_serializers.ExpandableFieldsBadTupleLengthSerializer,
                id="vueda_core.E002",
            )
        ]

    def test_unresolvable_serializer_string_system_check_error(self):
        """ExpandableFieldsUnresolvableStringSerializer points at a class that doesn't exist; check must flag E003."""
        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ExpandableFieldsUnresolvableStringSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert len(errors) == 1
        assert errors[0].id == "vueda_core.E003"
        assert errors[0].obj is err_serializers.ExpandableFieldsUnresolvableStringSerializer
        assert (
            "ExpandableFieldsUnresolvableStringSerializer.Meta.expandable_fields['no_name'] has an unresolvable "
            "serializer string" in errors[0].msg
        )

    def test_not_a_class_system_check_error(self):
        """ExpandableFieldsNotClassSerializer uses a plain int; check must flag it as E004."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ExpandableFieldsNotClassSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsNotClassSerializer.Meta.expandable_fields['no_name'] is not a Serializer/Field "
                "class, tuple, or serializer string.",
                hint=(
                    "It must be a tuple of (Serializer/Field class or lazy string, options dict), or simply a "
                    "Serializer/Field class or lazy string."
                ),
                obj=err_serializers.ExpandableFieldsNotClassSerializer,
                id="vueda_core.E004",
            )
        ]

    def test_valid_serializer_string_passes_system_check(self):
        """ExpandableFieldsValidStringSerializer's lazy string resolves cleanly; check must produce no errors."""
        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ExpandableFieldsValidStringSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == []

    def test_valid_tuple_passes_system_check(self):
        """RelatedObjectsAreMissingDataSerializer's (Serializer, options) tuple is valid; check must produce no errors."""
        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.RelatedObjectsAreMissingDataSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == []

    def test_recurses_into_resolved_expand_serializer(self):
        """The check must also validate expandable_fields on serializers reached via another's expandable_fields."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ExpandableFieldsNestedInvalidSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        # ExpandableFieldsNestedInvalidSerializer's own "bad_child" entry is valid, but it points at
        # ExpandableFieldsListSerializer, whose "no_name" entry is a list. Only that error should surface.
        assert errors == [
            Error(
                "ExpandableFieldsListSerializer.Meta.expandable_fields['no_name'] is a list.",
                hint="flex-fields only supports tuples for expandable_fields values, not lists.",
                obj=err_serializers.ExpandableFieldsListSerializer,
                id="vueda_core.E001",
            )
        ]
