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
            ("erring", "MoSoVoWo", "read"),
            ("erring", "MoSoVoWx", "read"),
            ("erring", "MoSoVxWo", "read"),
            ("erring", "MoSoVxWx", "read"),
            ("erring", "MoSoVzWo", "read"),
            ("erring", "MoSoVzWx", "read"),
            ("erring", "MoSxVoWo", "read"),
            ("erring", "MoSxVoWx", "read"),
            ("erring", "MoSxVxWo", "read"),
            ("erring", "MoSxVxWx", "read"),
            ("erring", "MoSxVzWo", "read"),
            ("erring", "MoSxVzWx", "read"),
            ("erring", "MxSoVoWo", "read"),
            ("erring", "MxSoVoWx", "read"),
            ("erring", "MxSoVxWo", "read"),
            ("erring", "MxSoVxWx", "read"),
            ("erring", "MxSoVzWo", "read"),
            ("erring", "MxSoVzWx", "read"),
            ("erring", "MxSxVoWo", "read"),
            ("erring", "MxSxVoWx", "read"),
            ("erring", "MxSxVxWo", "read"),
            ("erring", "MxSxVxWx", "read"),
            ("erring", "MxSxVzWo", "read"),
            ("erring", "MxSxVzWx", "read"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "test_customer_1@domain.invalid": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


RESULT_KEYS = frozenset({"id", "app_label", "model", "verbose_name", "verbose_name_plural"})


@pytest.mark.django_db
class TestModelInfoWorkflowConfigurationErrs:
    @pytest.fixture
    def test_data(self):
        return VuedaWorkflowTestData()

    def setup_registry(self):
        info.registration.get_empty_registry()
        info.register(err_serializers.MoSoVoWoSerializer, err_viewsets.MoSoVoWoViewSet)
        info.register(err_serializers.MxSoVoWoSerializer, err_viewsets.MxSoVoWoViewSet)
        info.register(err_serializers.MoSxVoWoSerializer, err_viewsets.MoSxVoWoViewSet)
        info.register(err_serializers.MxSxVoWoSerializer, err_viewsets.MxSxVoWoViewSet)
        info.register(err_serializers.MoSoVxWoSerializer, err_viewsets.MoSoVxWoViewSet)
        info.register(err_serializers.MxSoVxWoSerializer, err_viewsets.MxSoVxWoViewSet)
        info.register(err_serializers.MoSxVxWoSerializer, err_viewsets.MoSxVxWoViewSet)
        info.register(err_serializers.MxSxVxWoSerializer, err_viewsets.MxSxVxWoViewSet)
        info.register_serializer(err_serializers.MoSoVzWoSerializer)
        info.register_serializer(err_serializers.MxSoVzWoSerializer)
        info.register_serializer(err_serializers.MoSxVzWoSerializer)
        info.register_serializer(err_serializers.MxSxVzWoSerializer)
        info.register(err_serializers.MoSoVoWxSerializer, err_viewsets.MoSoVoWxViewSet)
        info.register(err_serializers.MxSoVoWxSerializer, err_viewsets.MxSoVoWxViewSet)
        info.register(err_serializers.MoSxVoWxSerializer, err_viewsets.MoSxVoWxViewSet)
        info.register(err_serializers.MxSxVoWxSerializer, err_viewsets.MxSxVoWxViewSet)
        info.register(err_serializers.MoSoVxWxSerializer, err_viewsets.MoSoVxWxViewSet)
        info.register(err_serializers.MxSoVxWxSerializer, err_viewsets.MxSoVxWxViewSet)
        info.register(err_serializers.MoSxVxWxSerializer, err_viewsets.MoSxVxWxViewSet)
        info.register(err_serializers.MxSxVxWxSerializer, err_viewsets.MxSxVxWxViewSet)
        info.register_serializer(err_serializers.MoSoVzWxSerializer)
        info.register_serializer(err_serializers.MxSoVzWxSerializer)
        info.register_serializer(err_serializers.MoSxVzWxSerializer)
        info.register_serializer(err_serializers.MxSxVzWxSerializer)

    @pytest.mark.parametrize(
        "model,will_err,expected_error",
        [
            (err_models.MoSoVoWo, False, RESULT_KEYS),
            (err_models.MoSoVoWx, True, frozenset(("MoSoVoWx has no workflow configured.",))),
            (err_models.MoSoVxWo, True, frozenset(("MoSoVxWoViewSet is missing HasWorkflowViewMixin inheritance.",))),
            (
                err_models.MoSoVxWx,
                True,
                frozenset(
                    (
                        "MoSoVxWxViewSet is missing HasWorkflowViewMixin inheritance.",
                        "MoSoVxWx has no workflow configured.",
                    )
                ),
            ),
            (err_models.MoSoVzWo, False, RESULT_KEYS),
            (err_models.MoSoVzWx, True, frozenset(("MoSoVzWx has no workflow configured.",))),
            (
                err_models.MoSxVoWo,
                True,
                frozenset(("MoSxVoWoSerializer is missing HasWorkflowSerializerMixin inheritance.",)),
            ),
            (
                err_models.MoSxVoWx,
                True,
                frozenset(
                    (
                        "MoSxVoWxSerializer is missing HasWorkflowSerializerMixin inheritance.",
                        "MoSxVoWx has no workflow configured.",
                    )
                ),
            ),
            (
                err_models.MoSxVxWo,
                True,
                frozenset(
                    (
                        "MoSxVxWoSerializer is missing HasWorkflowSerializerMixin inheritance.",
                        "MoSxVxWoViewSet is missing HasWorkflowViewMixin inheritance.",
                    )
                ),
            ),
            (
                err_models.MoSxVxWx,
                True,
                frozenset(
                    (
                        "MoSxVxWxSerializer is missing HasWorkflowSerializerMixin inheritance.",
                        "MoSxVxWxViewSet is missing HasWorkflowViewMixin inheritance.",
                        "MoSxVxWx has no workflow configured.",
                    )
                ),
            ),
            (
                err_models.MoSxVzWo,
                True,
                frozenset(("MoSxVzWoSerializer is missing HasWorkflowSerializerMixin inheritance.",)),
            ),
            (
                err_models.MoSxVzWx,
                True,
                frozenset(
                    (
                        "MoSxVzWxSerializer is missing HasWorkflowSerializerMixin inheritance.",
                        "MoSxVzWx has no workflow configured.",
                    )
                ),
            ),
            (err_models.MxSoVoWo, True, frozenset(("MxSoVoWo is missing HasWorkflowModelMixin inheritance.",))),
            (
                err_models.MxSoVoWx,
                True,
                frozenset(
                    (
                        "MxSoVoWx is missing HasWorkflowModelMixin inheritance.",
                        "MxSoVoWx has no workflow configured.",
                    )
                ),
            ),
            (
                err_models.MxSoVxWo,
                True,
                frozenset(
                    (
                        "MxSoVxWo is missing HasWorkflowModelMixin inheritance.",
                        "MxSoVxWoViewSet is missing HasWorkflowViewMixin inheritance.",
                    )
                ),
            ),
            (
                err_models.MxSoVxWx,
                True,
                frozenset(
                    (
                        "MxSoVxWx is missing HasWorkflowModelMixin inheritance.",
                        "MxSoVxWxViewSet is missing HasWorkflowViewMixin inheritance.",
                        "MxSoVxWx has no workflow configured.",
                    )
                ),
            ),
            (err_models.MxSoVzWo, True, frozenset(("MxSoVzWo is missing HasWorkflowModelMixin inheritance.",))),
            (
                err_models.MxSoVzWx,
                True,
                frozenset(
                    (
                        "MxSoVzWx is missing HasWorkflowModelMixin inheritance.",
                        "MxSoVzWx has no workflow configured.",
                    )
                ),
            ),
            (
                err_models.MxSxVoWo,
                True,
                frozenset(
                    (
                        "MxSxVoWo is missing HasWorkflowModelMixin inheritance.",
                        "MxSxVoWoSerializer is missing HasWorkflowSerializerMixin inheritance.",
                    )
                ),
            ),
            (
                err_models.MxSxVoWx,
                True,
                frozenset(
                    (
                        "MxSxVoWx is missing HasWorkflowModelMixin inheritance.",
                        "MxSxVoWxSerializer is missing HasWorkflowSerializerMixin inheritance.",
                        "MxSxVoWx has no workflow configured.",
                    )
                ),
            ),
            (
                err_models.MxSxVxWo,
                True,
                frozenset(
                    (
                        "MxSxVxWo is missing HasWorkflowModelMixin inheritance.",
                        "MxSxVxWoSerializer is missing HasWorkflowSerializerMixin inheritance.",
                        "MxSxVxWoViewSet is missing HasWorkflowViewMixin inheritance.",
                    )
                ),
            ),
            (err_models.MxSxVxWx, False, RESULT_KEYS),
            (
                err_models.MxSxVzWo,
                True,
                frozenset(
                    (
                        "MxSxVzWo is missing HasWorkflowModelMixin inheritance.",
                        "MxSxVzWoSerializer is missing HasWorkflowSerializerMixin inheritance.",
                    )
                ),
            ),
            (err_models.MxSxVzWx, False, RESULT_KEYS),
        ],
    )
    def test_workflow_configuration(self, model, will_err, expected_error, test_data, api_client):
        user = test_data.users["test_customer_1@domain.invalid"]
        api_client.force_authenticate(user=user)

        with use_test_router(
            IncludeAppInRouteNameRouter,
            "erring/",
            (
                ("mo_so_vo_wo", err_viewsets.MoSoVoWoViewSet),
                ("mx_so_vo_wo", err_viewsets.MxSoVoWoViewSet),
                ("mo_sx_vo_wo", err_viewsets.MoSxVoWoViewSet),
                ("mx_sx_vo_wo", err_viewsets.MxSxVoWoViewSet),
                ("mo_so_vx_wo", err_viewsets.MoSoVxWoViewSet),
                ("mx_so_vx_wo", err_viewsets.MxSoVxWoViewSet),
                ("mo_sx_vx_wo", err_viewsets.MoSxVxWoViewSet),
                ("mx_sx_vx_wo", err_viewsets.MxSxVxWoViewSet),
                ("mo_so_vo_wx", err_viewsets.MoSoVoWxViewSet),
                ("mx_so_vo_wx", err_viewsets.MxSoVoWxViewSet),
                ("mo_sx_vo_wx", err_viewsets.MoSxVoWxViewSet),
                ("mx_sx_vo_wx", err_viewsets.MxSxVoWxViewSet),
                ("mo_so_vx_wx", err_viewsets.MoSoVxWxViewSet),
                ("mx_so_vx_wx", err_viewsets.MxSoVxWxViewSet),
                ("mo_sx_vx_wx", err_viewsets.MoSxVxWxViewSet),
                ("mx_sx_vx_wx", err_viewsets.MxSxVxWxViewSet),
            ),
        ):
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
            data = response.json()
            assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, response_body(response)
            assert expected_error == frozenset(response.data["detail"])

        else:
            data = response.json()
            assert response.status_code == HTTPStatus.OK, response_body(response)
            # In this case the expected error is actually the results.
            assert expected_error == frozenset(data)


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
        assert sorted(response.data["model_fields"].keys()) == ["available_actions", "formatted_name", "id"]


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
        # The serializer-backed sections still resolve.
        assert sorted(response.data["model_fields"].keys()) == ["available_actions", "formatted_name", "id"]
        assert response.data["model_expands"] == []
        assert sorted(perm["codename"] for perm in response.data["model_permissions"]) == [
            "create_noexpandablefieldsdata",
            "delete_noexpandablefieldsdata",
            "list_noexpandablefieldsdata",
            "read_noexpandablefieldsdata",
            "update_noexpandablefieldsdata",
        ]
