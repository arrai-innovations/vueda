# Contains tests that we don't want to register routes/urls
# for by default, because they are designed to have issues.
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.conf import settings
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.erring import models as err_models
from tests.erring import serializers as err_serializers
from tests.erring import viewsets as err_viewsets
from tests.utils import use_test_router
from vueda import info
from vueda.core.routers import IncludeAppInRouteNameRouter
from vueda.workflow.exceptions import WorkflowNotConfiguredError


class VuedaTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("erring", "RelatedObjectsAreMissingData", "read"),
            ("erring", "NoNameField", "list"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.mark.django_db
class TestModelInfoInvalidChoices:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def setup_registry():
        info.registration.get_empty_registry()
        info.register(err_serializers.NoExpandableFieldsDataSerializer, err_viewsets.NoExpandableFieldsDataViewSet)
        info.register(
            err_serializers.RelatedObjectsAreMissingDataSerializer, err_viewsets.RelatedObjectsAreMissingDataViewSet
        )

    def test_invalid_choices_model(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (
                ("no_expandable_fields_data", err_viewsets.NoExpandableFieldsDataViewSet),
                ("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),
            ),
        ):
            self.setup_registry()
            response = api_client.get(
                reverse("info.model_info_choices-list", args=("store", "pets", "tangible_type")),
                data={},
            )
        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert 'Unable to find the content type "store.pets".' == response.data["detail"]

    def test_invalid_filter_choices_model(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (
                ("no_expandable_fields_data", err_viewsets.NoExpandableFieldsDataViewSet),
                ("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),
            ),
        ):
            self.setup_registry()
            response = api_client.get(
                reverse("info.model_info_filterset_choices-list", args=("store", "pets", "tangible_type")),
                data={},
            )
        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert 'Unable to find the content type "store.pets".' == response.data["detail"]

    def test_invalid_choices_field(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (
                ("no_expandable_fields_data", err_viewsets.NoExpandableFieldsDataViewSet),
                ("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),
            ),
        ):
            self.setup_registry()
            response = api_client.get(
                reverse(
                    "info.model_info_choices-list", args=("erring", "relatedobjectsaremissingdata", "tangible_type")
                ),
                data={},
            )
        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert (
            "Invalid field 'tangible_type'. No choice fields found on erring.RelatedObjectsAreMissingData."
            == response.data["detail"]
        )

    def test_invalid_filter_choices_field(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (
                ("no_expandable_fields_data", err_viewsets.NoExpandableFieldsDataViewSet),
                ("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),
            ),
        ):
            self.setup_registry()
            response = api_client.get(
                reverse(
                    "info.model_info_filterset_choices-list",
                    args=("erring", "relatedobjectsaremissingdata", "tangible_type"),
                ),
                data={},
            )
        assert response.status_code == HTTPStatus.NOT_FOUND, response_body(response)
        assert "Invalid filter 'tangible_type'. Valid filters are id, no_name." == response.data["detail"]


class VuedaWorkflowTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("erring", "EnabledWithWorkflow", "read"),
            ("erring", "EnabledWithoutWorkflow", "read"),
            ("erring", "NotEnabledWithWorkflow", "read"),
            ("erring", "NotEnabledWithoutWorkflow", "read"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


RESULT_KEYS = frozenset({"id", "app_label", "model", "verbose_name", "verbose_name_plural", "workflow_enabled"})


@pytest.mark.django_db
class TestModelInfoWorkflowConfigurationErrs:
    @pytest.fixture
    def test_data(self):
        return VuedaWorkflowTestData()

    def setup_registry(self):
        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.EnabledWithWorkflowSerializer)
        info.register_serializer(err_serializers.EnabledWithoutWorkflowSerializer)
        info.register_serializer(err_serializers.NotEnabledWithWorkflowSerializer)
        info.register_serializer(err_serializers.NotEnabledWithoutWorkflowSerializer)

    @pytest.mark.parametrize(
        ("model", "will_err"),
        [
            # Only a model that enables workflow and has no workflow definition is misconfigured. A
            # workflow row alone does not opt a model in.
            (err_models.EnabledWithWorkflow, False),
            (err_models.EnabledWithoutWorkflow, True),
            (err_models.NotEnabledWithWorkflow, False),
            (err_models.NotEnabledWithoutWorkflow, False),
        ],
    )
    def test_workflow_configuration(self, model, will_err, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        self.setup_registry()
        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    "erring",
                    model._meta.model_name,
                ),
            ),
        )

        if will_err:
            assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, response_body(response)
            assert frozenset(WorkflowNotConfiguredError(model).args) == frozenset(response.data["detail"])

        else:
            assert response.status_code == HTTPStatus.OK, response_body(response)
            assert RESULT_KEYS == frozenset(response.json())


class VuedaFormattedNameTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("erring", "RelatedObjectsAreMissingData", "list"),
            ("erring", "RelatedObjectsAreMissingData", "read"),
            ("erring", "NoNameField", "list"),
            ("erring", "NoNameField", "read"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.mark.django_db
class TestFormattedName:
    @pytest.fixture
    def test_data(self):
        return VuedaFormattedNameTestData()

    def test_no_formatted_name(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        related_obj = err_models.RelatedObjectsAreMissingData.objects.create()

        obj1 = err_models.NoNameField.objects.create(the_name_field="Test1")
        related_obj.no_name.add(obj1)

        obj2 = err_models.NoNameField.objects.create(the_name_field="Test2")
        related_obj.no_name.add(obj2)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),),
        ):
            info.registration.get_empty_registry()
            info.register(
                err_serializers.RelatedObjectsAreMissingDataSerializer, err_viewsets.RelatedObjectsAreMissingDataViewSet
            )
            response = api_client.get(
                reverse(
                    "info.model_info_filterset_choices-list",
                    args=("erring", "relatedobjectsaremissingdata", "no_name"),
                ),
                format="json",
                data={
                    settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                        "model_expands",
                    ],
                },
            )

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, response_body(response)
        assert (
            "Cannot resolve keyword "
            "'formatted_name' into field. Choices are: events, id, "
            "relatedobjectsaremissingdata, the_name_field"
        ) in response.data["serverStack"]

    def test_expand_model_with_no_formatted_name_returns_null(self, test_data, api_client):
        """Expanding a model that has formatted_name = None and no alternatives returns null for formatted_name rather than crashing."""
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        related_obj = err_models.RelatedObjectsAreMissingData.objects.create()
        no_name_obj = err_models.NoNameField.objects.create(the_name_field="Test1")
        related_obj.no_name.add(no_name_obj)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet),),
        ):
            info.registration.get_empty_registry()
            info.register(
                err_serializers.RelatedObjectsAreMissingDataSerializer, err_viewsets.RelatedObjectsAreMissingDataViewSet
            )
            response = api_client.get(
                reverse("erring.relatedobjectsaremissingdata-list"),
                data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "no_name"},
            )

        assert response.status_code == HTTPStatus.OK, response.content
        results = response.data["results"]
        assert len(results) == 1
        assert results[0]["formatted_name"] is None
        expanded = results[0]["no_name"]
        assert len(expanded) == 1
        assert expanded[0]["formatted_name"] is None

    def test_non_string_lookup_expression_returns_none(self):
        """_get_formatted_name returns None when formatted_name_lookup_expression is not a string."""
        instance = err_models.FormattedNameExpressionNotString()
        assert instance._get_formatted_name() is None

    def test_string_lookup_expression_returns_field_value(self):
        """_get_formatted_name returns the looked-up field value when formatted_name_lookup_expression is a string."""
        instance = err_models.ValidLookupExpression(the_name_field="Test Name")
        assert instance._get_formatted_name() == "Test Name"


class VuedaExcludeFieldsTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("erring", "NoExpandableFieldsData", "read"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.mark.django_db
class TestModelInfoExcludeFieldsSerializerMixin:
    """ExcludeFieldsSerializer is registered with a ViewSet directly -- the only valid use of
    ExcludeFieldsSerializerMixin. Regression coverage for ModelInfoSerializer.get_model_fields()
    threading its context through get_model_fields_data(), instead of instantiating the canonical
    serializer bare (which raised KeyError: 'view')."""

    @pytest.fixture
    def test_data(self):
        return VuedaExcludeFieldsTestData()

    def test_model_fields_does_not_crash(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        info.registration.get_empty_registry()
        info.register(err_serializers.ExcludeFieldsSerializer, err_viewsets.ExcludeFieldsViewSet)

        response = api_client.get(
            reverse("info.model_info-detail", args=("erring", "noexpandablefieldsdata")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_fields"},
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert sorted(response.data["model_fields"].keys()) == [
            "available_actions",
            "formatted_name",
            "id",
            "object_revision",
        ]


@pytest.mark.django_db
class TestModelInfoExcludeFieldsSerializerOnlyRegistration:
    """ExcludeFieldsSerializer is registered with register_serializer() and no ViewSet. vueda_core.E009
    reports this as unsupported on the grounds that ExcludeFieldsSerializerMixin never receives a view in
    its context. This exercises every /info/ metadata section against such a registration to record whether
    that claim still holds."""

    @pytest.fixture
    def test_data(self):
        return VuedaExcludeFieldsTestData()

    @pytest.fixture(autouse=True)
    def isolated_registry(self):
        """The registry is a module global, and a viewset-less ExcludeFieldsSerializer registration left
        behind here makes check_exclude_fields_serializer_usage() report vueda_core.E009 in other test
        modules that read the registry without resetting it."""
        info.registration.get_empty_registry()
        yield
        info.registration.get_empty_registry()

    def test_every_metadata_section_does_not_crash(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        info.register_serializer(err_serializers.ExcludeFieldsSerializer)

        response = api_client.get(
            reverse("info.model_info-detail", args=("erring", "noexpandablefieldsdata")),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_actions",
                    "model_column_totals",
                    "model_expands",
                    "model_fields",
                    "model_filtering",
                    "model_ordering",
                    "model_permissions",
                ],
            },
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        # The viewset-backed sections have nothing to report without a ViewSet.
        assert response.data["model_actions"] == []
        assert response.data["model_ordering"] == {
            "default": [],
            "fields": [],
        }
        assert response.data["model_filtering"] == {}
        # The section is still reported, empty, rather than omitted: a viewset-backed section with
        # no viewset behind it has nothing to offer, the same as one declaring no totals.
        assert response.data["model_column_totals"] == {"fields": []}
        # The serializer-backed sections still resolve.
        assert sorted(response.data["model_fields"].keys()) == [
            "available_actions",
            "formatted_name",
            "id",
            "object_revision",
        ]
        assert response.data["model_expands"] == []
        assert sorted(perm["codename"] for perm in response.data["model_permissions"]) == [
            "create_noexpandablefieldsdata",
            "delete_noexpandablefieldsdata",
            "list_noexpandablefieldsdata",
            "read_noexpandablefieldsdata",
            "update_noexpandablefieldsdata",
        ]


class VuedaFieldSourceResolutionTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("erring", "SourceResolution", "read"),
            ("erring", "UnresolvableLookupExpression", "read"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.mark.django_db
class TestFieldSourceResolutionInfoEndpoint:
    """A registry containing a field with an unresolvable source or lookup expression must not
    prevent /info/ from completing (issue #207)."""

    @pytest.fixture
    def test_data(self):
        return VuedaFieldSourceResolutionTestData()

    @pytest.fixture(autouse=True)
    def isolated_registry(self):
        info.registration.get_empty_registry()
        yield
        info.registration.get_empty_registry()

    def test_unresolvable_source_does_not_crash_info_endpoint(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        info.register_serializer(err_serializers.SourceResolutionSerializer)

        response = api_client.get(
            reverse("info.model_info-detail", args=("erring", "sourceresolution")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_fields"},
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_fields"]["bogus"]["type_db"] is None
        assert response.data["model_fields"]["bogus"]["type_model"] is None

    def test_unresolvable_lookup_expression_does_not_crash_info_endpoint(self, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        info.register_serializer(err_serializers.UnresolvableLookupExpressionSerializer)

        response = api_client.get(
            reverse("info.model_info-detail", args=("erring", "unresolvablelookupexpression")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_fields"},
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data["model_fields"]["formatted_name"]["type_db"] is None
        assert response.data["model_fields"]["formatted_name"]["type_model"] is None
