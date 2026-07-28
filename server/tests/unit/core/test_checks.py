import pytest

from tests.erring import serializers as err_serializers
from tests.erring import viewsets as err_viewsets
from tests.utils import use_test_router
from vueda.core.routers import IncludeAppInRouteNameRouter


@pytest.mark.django_db
class TestExpandableFieldsChecks:
    def test_list_value_system_check_error(self):
        """ExpandableFieldsListSerializer uses a list instead of a tuple; check must flag it as E001."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_list", err_viewsets.ExpandableFieldsListViewSet),),
        ):
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

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_bad_tuple_length", err_viewsets.ExpandableFieldsBadTupleLengthViewSet),),
        ):
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

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_unresolvable_string", err_viewsets.ExpandableFieldsUnresolvableStringViewSet),),
        ):
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

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_not_class", err_viewsets.ExpandableFieldsNotClassViewSet),),
        ):
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

    def test_non_dict_options_system_check_error(self):
        """ExpandableFieldsNonDictOptionsSerializer's tuple has a list options value; check must flag it as E005."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_non_dict_options", err_viewsets.ExpandableFieldsNonDictOptionsViewSet),),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsNonDictOptionsSerializer.Meta.expandable_fields['no_name'] has a list options value.",
                hint="A tuple value's second element must be a dict of flex-fields expand options.",
                obj=err_serializers.ExpandableFieldsNonDictOptionsSerializer,
                id="vueda_core.E005",
            )
        ]

    def test_not_field_subclass_system_check_error(self):
        """ExpandableFieldsNotFieldSubclassSerializer points at plain `int`; check must flag it as E006."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_not_field_subclass", err_viewsets.ExpandableFieldsNotFieldSubclassViewSet),),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsNotFieldSubclassSerializer.Meta.expandable_fields['no_name'] resolves to "
                "'int', which is not a Serializer/Field subclass.",
                hint="The class must subclass rest_framework.serializers.Serializer or rest_framework.fields.Field.",
                obj=err_serializers.ExpandableFieldsNotFieldSubclassSerializer,
                id="vueda_core.E006",
            )
        ]

    def test_valid_serializer_string_passes_system_check(self):
        """ExpandableFieldsValidStringSerializer's lazy string resolves cleanly; check must produce no errors."""
        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_valid_string", err_viewsets.ExpandableFieldsValidStringViewSet),),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == []

    def test_valid_tuple_passes_system_check(self):
        """RelatedObjectsAreMissingDataSerializer's (Serializer, options) tuple is valid; check produces no errors."""
        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == []

    def test_unregistered_serializer_reached_via_expandable_fields_is_checked(self):
        """A serializer that is never routed through a viewset must still be walked and validated when it is
        only reachable through another (routed) serializer's expandable_fields.

        This is the guarantee that lets get_schema_expandable_fields() skip its own inspect.isclass() guard and
        rely on system checks instead: every serializer the schema can reach must go through this check, not just
        the ones directly exposed by a router.
        """
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_points_at_unregistered", err_viewsets.ExpandableFieldsPointsAtUnregisteredViewSet),),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        # UnregisteredExpandableChildSerializer has no viewset/route of its own; it's only reachable via
        # ExpandableFieldsPointsAtUnregisteredSerializer's "child" expandable_fields entry.
        assert errors == [
            Error(
                "UnregisteredExpandableChildSerializer.Meta.expandable_fields['no_name'] resolves to "
                "'int', which is not a Serializer/Field subclass.",
                hint="The class must subclass rest_framework.serializers.Serializer or rest_framework.fields.Field.",
                obj=err_serializers.UnregisteredExpandableChildSerializer,
                id="vueda_core.E006",
            )
        ]

    def test_recurses_into_resolved_expand_serializer(self):
        """The check must also validate expandable_fields on serializers reached via another's expandable_fields."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_nested_invalid", err_viewsets.ExpandableFieldsNestedInvalidViewSet),),
        ):
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

    def test_unregistered_non_vueda_non_dict_options_system_check_error(self):
        """A plain (non-VuedaViewSet/non-VuedaSerializer) DRF ModelViewSet is checked too.

        UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer's tuple has a list options value; check
        must flag it as E005, proving the check discovers serializers via any router-registered ViewSet, not
        just VUEDA ones.
        """
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (
                (
                    "unregistered_non_vueda_expandable_fields_non_dict_options",
                    err_viewsets.UnregisteredNonVuedaExpandableFieldsNonDictOptionsViewSet,
                ),
            ),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer.Meta.expandable_fields['no_name'] "
                "has a list options value.",
                hint="A tuple value's second element must be a dict of flex-fields expand options.",
                obj=err_serializers.UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer,
                id="vueda_core.E005",
            )
        ]
