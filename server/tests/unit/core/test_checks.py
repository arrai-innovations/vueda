import pytest

from tests.erring import serializers as err_serializers
from tests.erring import viewsets as err_viewsets
from tests.utils import use_test_router
from vueda.core.routers import IncludeAppInRouteNameRouter


@pytest.fixture(autouse=True)
def empty_info_registry():
    """Run each test against an empty vueda.info registry, then restore the original.

    Both serializer system checks seed their graph traversal from the registry, so a
    registration left behind by another test would change what they discover.
    """
    from vueda.info import registration

    original = registration._registry
    registration.get_empty_registry()
    yield
    registration._registry = original


@pytest.mark.django_db
class TestExpandableFieldsChecks:
    def test_list_value_system_check_error(self, settings):
        """ExpandableFieldsListSerializer uses a list instead of a tuple; check must flag it as E001."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_list_value"

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsListSerializer.Meta.expandable_fields['no_name'] is a list.",
                hint="flex-fields only supports tuples for expandable_fields values, not lists.",
                obj=err_serializers.ExpandableFieldsListSerializer,
                id="vueda_core.E001",
            )
        ]

    def test_bad_tuple_length_system_check_error(self, settings):
        """ExpandableFieldsBadTupleLengthSerializer has a 3-tuple; check must flag it as E002."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_bad_tuple_length"

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsBadTupleLengthSerializer.Meta.expandable_fields['no_name'] is a 3-tuple.",
                hint="A tuple value must be exactly (Serializer/Field class or lazy string, options dict).",
                obj=err_serializers.ExpandableFieldsBadTupleLengthSerializer,
                id="vueda_core.E002",
            )
        ]

    def test_unresolvable_serializer_string_system_check_error(self, settings):
        """ExpandableFieldsUnresolvableStringSerializer points at a class that doesn't exist; check must flag E003."""
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_unresolvable_serializer_string"

        errors = check_expandable_fields_configuration(app_configs=None)

        assert len(errors) == 1
        assert errors[0].id == "vueda_core.E003"
        assert errors[0].obj is err_serializers.ExpandableFieldsUnresolvableStringSerializer
        assert (
            "ExpandableFieldsUnresolvableStringSerializer.Meta.expandable_fields['no_name'] has an unresolvable "
            "serializer string" in errors[0].msg
        )

    def test_not_a_class_system_check_error(self, settings):
        """ExpandableFieldsNotClassSerializer uses a plain int; check must flag it as E004."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_not_a_class"

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

    def test_non_dict_options_system_check_error(self, settings):
        """ExpandableFieldsNonDictOptionsSerializer's tuple has a list options value; check must flag it as E005."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_non_dict_options"

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsNonDictOptionsSerializer.Meta.expandable_fields['no_name'] has a list options value.",
                hint="A tuple value's second element must be a dict of flex-fields expand options.",
                obj=err_serializers.ExpandableFieldsNonDictOptionsSerializer,
                id="vueda_core.E005",
            )
        ]

    def test_not_field_subclass_system_check_error(self, settings):
        """ExpandableFieldsNotFieldSubclassSerializer points at plain `int`; check must flag it as E006."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_not_field_subclass"

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
        """Every serializer reachable through the real, fully-registered URL conf must pass the check cleanly.

        Unlike the other tests in this class, this one deliberately does not swap in an isolated URL conf: the
        point is to validate expandable_fields configuration across all serializers actually routed in the
        application, not just a single serializer.
        """
        from vueda.core.checks import check_expandable_fields_configuration

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("expandable_fields_valid_string", err_viewsets.ExpandableFieldsValidStringViewSet),),
        ):
            errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == []

    def test_valid_tuple_passes_system_check(self, settings):
        """RelatedObjectsAreMissingDataSerializer's (Serializer, options) tuple is valid; check produces no errors."""
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == []

    def test_unregistered_serializer_reached_via_expandable_fields_is_checked(self, settings):
        """A serializer that is never routed through a viewset must still be walked and validated when it is
        only reachable through another (routed) serializer's expandable_fields.

        This is the guarantee that lets get_schema_expandable_fields() skip its own inspect.isclass() guard and
        rely on system checks instead: every serializer the schema can reach must go through this check, not just
        the ones directly exposed by a router.
        """
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_unregistered_expandable_child"

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

    def test_recurses_into_resolved_expand_serializer(self, settings):
        """The check must also validate expandable_fields on serializers reached via another's expandable_fields."""
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_nested_invalid"

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

    def test_unregistered_non_vueda_non_dict_options_system_check_error(self, settings):
        """A plain (non-VuedaViewSet/non-VuedaSerializer) DRF ModelViewSet is checked too.

        UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer's tuple has a list options value; check
        must flag it as E005, proving the check discovers serializers via any router-registered ViewSet, not
        just VUEDA ones.
        """
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_unregistered_non_vueda_non_dict_options"

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

    def test_serializer_only_registration_is_checked(self, settings):
        """A serializer reachable only through info.register_serializer() must still be validated.

        The URL conf routes nothing that reaches ExpandableFieldsListSerializer, so the registration is
        the check's only way to find it.
        """
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

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

    def test_serializer_only_registration_recurses_into_expandable_child(self, settings):
        """Traversal from a serializer-only registered root reaches that root's expandable children.

        ExpandableFieldsNestedInvalidSerializer's own entry is valid; the error belongs to the
        ExpandableFieldsListSerializer it expands to.
        """
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register_serializer(err_serializers.ExpandableFieldsNestedInvalidSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsListSerializer.Meta.expandable_fields['no_name'] is a list.",
                hint="flex-fields only supports tuples for expandable_fields values, not lists.",
                obj=err_serializers.ExpandableFieldsListSerializer,
                id="vueda_core.E001",
            )
        ]

    def test_viewset_registration_without_a_route_is_checked(self, settings):
        """info.register() registrations seed the check too, even when the viewset has no route."""
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register(err_serializers.ExpandableFieldsListSerializer, err_viewsets.ExpandableFieldsListViewSet)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsListSerializer.Meta.expandable_fields['no_name'] is a list.",
                hint="flex-fields only supports tuples for expandable_fields values, not lists.",
                obj=err_serializers.ExpandableFieldsListSerializer,
                id="vueda_core.E001",
            )
        ]

    def test_empty_tuple_system_check_error(self, settings):
        """ExpandableFieldsEmptyTupleSerializer holds a 0-tuple; check must flag it as E002, not raise.

        An empty tuple carries no serializer to unwrap, so graph traversal has to tolerate it for the
        check to report anything at all.
        """
        from django.core.checks import Error

        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_empty_tuple"

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsEmptyTupleSerializer.Meta.expandable_fields['no_name'] is a 0-tuple.",
                hint="A tuple value must be exactly (Serializer/Field class or lazy string, options dict).",
                obj=err_serializers.ExpandableFieldsEmptyTupleSerializer,
                id="vueda_core.E002",
            )
        ]

    def test_empty_tuple_from_registration_system_check_error(self, settings):
        """A 0-tuple on a serializer-only registered root reports E002 the same way a routed one does."""
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register_serializer(err_serializers.ExpandableFieldsEmptyTupleSerializer)

        errors = check_expandable_fields_configuration(app_configs=None)

        assert errors == [
            Error(
                "ExpandableFieldsEmptyTupleSerializer.Meta.expandable_fields['no_name'] is a 0-tuple.",
                hint="A tuple value must be exactly (Serializer/Field class or lazy string, options dict).",
                obj=err_serializers.ExpandableFieldsEmptyTupleSerializer,
                id="vueda_core.E002",
            )
        ]

    def test_routed_and_registered_serializer_reports_one_error(self, settings):
        """A serializer found through both a route and a registration is walked once, not twice."""
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_expandable_fields_configuration

        settings.ROOT_URLCONF = "tests.unit.core.urls_list_value"

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


@pytest.mark.django_db
class TestExcludeFieldsSerializerUsageChecks:
    def test_registered_with_a_view_passes_system_check(self, settings):
        """ExcludeFieldsSerializer is a routed ViewSet's serializer_class directly -- the only valid use."""
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_exclude_fields_valid"

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == []

    def test_nested_field_system_check_error(self, settings):
        """ExcludeFieldsAsNestedFieldSerializer nests ExcludeFieldsSerializer as a declared field; check
        must flag it as E007."""
        from django.core.checks import Error

        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_exclude_fields_nested"

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == [
            Error(
                "ExcludeFieldsSerializer is used as ExcludeFieldsAsNestedFieldSerializer's 'leaf' field, but "
                "inherits ExcludeFieldsSerializerMixin.",
                hint=(
                    "ExcludeFieldsSerializerMixin requires a view in its context, which is only present when "
                    "it is a routed ViewSet's serializer_class directly -- not when nested as a field on "
                    "another serializer."
                ),
                obj=err_serializers.ExcludeFieldsSerializer,
                id="vueda_core.E007",
            )
        ]

    def test_expandable_field_system_check_error(self, settings):
        """ExcludeFieldsAsExpandableFieldSerializer only reaches ExcludeFieldsSerializer through
        expandable_fields; check must flag it as E008."""
        from django.core.checks import Error

        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_exclude_fields_expandable"

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == [
            Error(
                "ExcludeFieldsSerializer is used as an expandable field "
                "(ExcludeFieldsAsExpandableFieldSerializer.Meta.expandable_fields['leaf']), but inherits "
                "ExcludeFieldsSerializerMixin.",
                hint=(
                    "ExcludeFieldsSerializerMixin requires a view in its context, which is only present when "
                    "it is a routed ViewSet's serializer_class directly -- not when reachable through another "
                    "serializer's expandable_fields."
                ),
                obj=err_serializers.ExcludeFieldsSerializer,
                id="vueda_core.E008",
            )
        ]

    def test_register_serializer_only_system_check_error(self, settings):
        """A serializer registered with info.register_serializer() (no viewset) never gets a view in
        context; check must flag it as E009."""
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register_serializer(err_serializers.ExcludeFieldsSerializer)

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == [
            Error(
                "ExcludeFieldsSerializer is registered with register_serializer() (no viewset), but inherits "
                "ExcludeFieldsSerializerMixin.",
                hint=(
                    "ExcludeFieldsSerializerMixin requires a view in its context, which is never present for a "
                    "serializer registered without a viewset."
                ),
                obj=err_serializers.ExcludeFieldsSerializer,
                id="vueda_core.E009",
            )
        ]

    def test_registered_parent_nested_field_system_check_error(self, settings):
        """A registered parent's declared nested ExcludeFieldsSerializerMixin child is flagged as E007.

        ExcludeFieldsAsNestedFieldSerializer has no route here; the registration is what the check
        traverses from.
        """
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register_serializer(err_serializers.ExcludeFieldsAsNestedFieldSerializer)

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == [
            Error(
                "ExcludeFieldsSerializer is used as ExcludeFieldsAsNestedFieldSerializer's 'leaf' field, but "
                "inherits ExcludeFieldsSerializerMixin.",
                hint=(
                    "ExcludeFieldsSerializerMixin requires a view in its context, which is only present when "
                    "it is a routed ViewSet's serializer_class directly -- not when nested as a field on "
                    "another serializer."
                ),
                obj=err_serializers.ExcludeFieldsSerializer,
                id="vueda_core.E007",
            )
        ]

    def test_registered_parent_expandable_field_system_check_error(self, settings):
        """A registered parent's expandable ExcludeFieldsSerializerMixin child is flagged as E008."""
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register_serializer(err_serializers.ExcludeFieldsAsExpandableFieldSerializer)

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == [
            Error(
                "ExcludeFieldsSerializer is used as an expandable field "
                "(ExcludeFieldsAsExpandableFieldSerializer.Meta.expandable_fields['leaf']), but inherits "
                "ExcludeFieldsSerializerMixin.",
                hint=(
                    "ExcludeFieldsSerializerMixin requires a view in its context, which is only present when "
                    "it is a routed ViewSet's serializer_class directly -- not when reachable through another "
                    "serializer's expandable_fields."
                ),
                obj=err_serializers.ExcludeFieldsSerializer,
                id="vueda_core.E008",
            )
        ]

    def test_empty_tuple_expandable_entry_is_skipped(self, settings):
        """A 0-tuple expandable entry resolves to no child, so this check passes over it rather than raising.

        check_expandable_fields_configuration owns reporting the malformed entry itself, as E002.
        """
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_empty_tuple"

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == []

    def test_empty_tuple_expandable_entry_from_registration_is_skipped(self, settings):
        """A 0-tuple on a serializer-only registered root is skipped the same way a routed one is."""
        from vueda import info
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_valid_tuple"

        info.register_serializer(err_serializers.ExpandableFieldsEmptyTupleSerializer)

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == []

    def test_routed_and_registered_parent_reports_one_error(self, settings):
        """A parent found through both a route and a registration reports its misused child once."""
        from django.core.checks import Error

        from vueda import info
        from vueda.core.checks import check_exclude_fields_serializer_usage

        settings.ROOT_URLCONF = "tests.unit.core.urls_exclude_fields_nested"

        info.register(
            err_serializers.ExcludeFieldsAsNestedFieldSerializer,
            err_viewsets.ExcludeFieldsAsNestedFieldViewSet,
        )

        errors = check_exclude_fields_serializer_usage(app_configs=None)

        assert errors == [
            Error(
                "ExcludeFieldsSerializer is used as ExcludeFieldsAsNestedFieldSerializer's 'leaf' field, but "
                "inherits ExcludeFieldsSerializerMixin.",
                hint=(
                    "ExcludeFieldsSerializerMixin requires a view in its context, which is only present when "
                    "it is a routed ViewSet's serializer_class directly -- not when nested as a field on "
                    "another serializer."
                ),
                obj=err_serializers.ExcludeFieldsSerializer,
                id="vueda_core.E007",
            )
        ]


class TestSessionCacheChecks:
    """`check_session_cache_is_shared` reports sessions kept in a cache workers cannot share."""

    def _configure(self, settings, backend, *, debug=False, engine="django.contrib.sessions.backends.cache"):
        settings.DEBUG = debug
        settings.SESSION_ENGINE = engine
        settings.CACHES = {"default": {"BACKEND": backend}}

    def test_locmem_behind_cache_sessions_is_reported(self, settings):
        from vueda.core.checks import check_session_cache_is_shared

        self._configure(settings, "django.core.cache.backends.locmem.LocMemCache")

        warnings = check_session_cache_is_shared(app_configs=None)

        assert [warning.id for warning in warnings] == ["vueda_core.W001"]
        assert "LocMemCache" in warnings[0].msg
        assert "CACHE_URL" in warnings[0].hint

    def test_dummy_cache_behind_cache_sessions_is_reported(self, settings):
        # DummyCache stores nothing, so it loses a session immediately rather than between workers.
        from vueda.core.checks import check_session_cache_is_shared

        self._configure(settings, "django.core.cache.backends.dummy.DummyCache")

        assert [warning.id for warning in check_session_cache_is_shared(app_configs=None)] == ["vueda_core.W001"]

    def test_shared_backend_passes(self, settings):
        from vueda.core.checks import check_session_cache_is_shared

        self._configure(settings, "django.core.cache.backends.redis.RedisCache")

        assert check_session_cache_is_shared(app_configs=None) == []

    def test_database_sessions_pass_on_a_per_process_cache(self, settings):
        # The cache holds no sessions, so its reach does not matter to them.
        from vueda.core.checks import check_session_cache_is_shared

        self._configure(
            settings,
            "django.core.cache.backends.locmem.LocMemCache",
            engine="django.contrib.sessions.backends.db",
        )

        assert check_session_cache_is_shared(app_configs=None) == []

    def test_cached_db_sessions_pass_on_a_per_process_cache(self, settings):
        # cached_db writes through to the database, so a per-process cache costs reads, not sessions.
        from vueda.core.checks import check_session_cache_is_shared

        self._configure(
            settings,
            "django.core.cache.backends.locmem.LocMemCache",
            engine="django.contrib.sessions.backends.cached_db",
        )

        assert check_session_cache_is_shared(app_configs=None) == []

    def test_debug_passes(self, settings):
        # A single-process development server shares its cache with itself.
        from vueda.core.checks import check_session_cache_is_shared

        self._configure(settings, "django.core.cache.backends.locmem.LocMemCache", debug=True)

        assert check_session_cache_is_shared(app_configs=None) == []

    def test_session_cache_alias_is_followed(self, settings):
        from vueda.core.checks import check_session_cache_is_shared

        settings.DEBUG = False
        settings.SESSION_ENGINE = "django.contrib.sessions.backends.cache"
        settings.SESSION_CACHE_ALIAS = "sessions"
        settings.CACHES = {
            "default": {"BACKEND": "django.core.cache.backends.redis.RedisCache"},
            "sessions": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
        }

        warnings = check_session_cache_is_shared(app_configs=None)

        assert [warning.id for warning in warnings] == ["vueda_core.W001"]
        assert "'sessions'" in warnings[0].msg
