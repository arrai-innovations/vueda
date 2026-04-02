# Contains tests that we don't want to register routes/urls
# for by default, because they are designed to have issues.
from http import HTTPStatus
from pprint import pformat

import pytest
from django.conf import settings
from django.urls import include
from django.urls import path
from rest_framework.reverse import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.erring import models as err_models
from tests.erring import serializers as err_serializers
from tests.erring import viewsets as err_viewsets
from tests.urls import urlpatterns
from vueda import info
from vueda.core.routers import IncludeAppInRouteNameRouter


class VuedaTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
        "Customer": [
            ("contenttypes", "ContentType", "read"),
            ("erring", "RelatedObjectsAreMissingData", "read"),
            ("erring", "NoNameField", "list"),
        ]
    }

    users_to_create = {
        "test_customer_1@example.com": {
            "name": "Test Customer 1",
            "password": "testpass",
            "groups": ["Customer"],
        },
    }


@pytest.mark.django_db
class TestModelInfoErrs:
    @pytest.fixture
    def test_data(self):
        return VuedaTestData()

    @staticmethod
    def setup_router_and_registry():
        erring_router = IncludeAppInRouteNameRouter()
        erring_router.register("no_expandable_fields_data", err_viewsets.NoExpandableFieldsDataViewSet)
        erring_router.register("related_objects_are_missing_data", err_viewsets.RelatedObjectsAreMissingDataViewSet)

        urlpatterns.append(
            path("erring/", include(erring_router.urls)),
        )

        info.registration.get_empty_registry()
        info.register(err_serializers.NoExpandableFieldsDataSerializer, err_viewsets.NoExpandableFieldsDataViewSet)
        info.register(
            err_serializers.RelatedObjectsAreMissingDataSerializer, err_viewsets.RelatedObjectsAreMissingDataViewSet
        )

    # TODO: Add tests that use settings with specific apps that cause system check errors.

    def test_no_formatted_name(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        related_obj = err_models.RelatedObjectsAreMissingData.objects.create()

        obj1 = err_models.NoNameField.objects.create(the_name_field="Test1")
        related_obj.no_name.add(obj1)

        obj2 = err_models.NoNameField.objects.create(the_name_field="Test2")
        related_obj.no_name.add(obj2)

        self.setup_router_and_registry()

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

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, pformat(response.data)
        assert (
            "Cannot resolve keyword "
            "'formatted_name' into field. Choices are: id, "
            "relatedobjectsaremissingdata, the_name_field"
        ) in response.data["serverStack"]

    def test_invalid_choices_model(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.setup_router_and_registry()

        response = api_client.get(
            "/routes/vueda.info/model_info_choices/store/pets/tangible_type/",
            data={},
        )
        assert response.status_code == HTTPStatus.NOT_FOUND, pformat(response.data)
        assert 'Unable to find the content type "store.pets".' == response.data["detail"]

    def test_invalid_filter_choices_model(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.setup_router_and_registry()

        response = api_client.get(
            "/routes/vueda.info/model_info_filter_choices/store/pets/tangible_type/",
            data={},
        )
        assert response.status_code == HTTPStatus.NOT_FOUND, pformat(response.data)
        assert 'Unable to find the content type "store.pets".' == response.data["detail"]

    def test_invalid_choices_field(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.setup_router_and_registry()

        response = api_client.get(
            "/routes/vueda.info/model_info_choices/erring/relatedobjectsaremissingdata/tangible_type/",
            data={},
        )
        assert response.status_code == HTTPStatus.NOT_FOUND, pformat(response.data)
        assert (
            "Invalid field 'tangible_type'. No choice fields found on erring.RelatedObjectsAreMissingData."
            == response.data["detail"]
        )

    def test_invalid_filter_choices_field(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.setup_router_and_registry()

        response = api_client.get(
            "/routes/vueda.info/model_info_filter_choices/erring/relatedobjectsaremissingdata/tangible_type/",
            data={},
        )
        assert response.status_code == HTTPStatus.NOT_FOUND, pformat(response.data)
        assert "Invalid filter 'tangible_type'. Valid filters are id, no_name." == response.data["detail"]


class VuedaWorkflowTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create = {
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

    users_to_create = {
        "test_customer_1@example.com": {
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

    def setup_router_and_registry(self):
        erring_router = IncludeAppInRouteNameRouter()
        erring_router.register("mo_so_vo_wo", err_viewsets.MoSoVoWoViewSet)
        erring_router.register("mx_so_vo_wo", err_viewsets.MxSoVoWoViewSet)
        erring_router.register("mo_sx_vo_wo", err_viewsets.MoSxVoWoViewSet)
        erring_router.register("mx_sx_vo_wo", err_viewsets.MxSxVoWoViewSet)
        erring_router.register("mo_so_vx_wo", err_viewsets.MoSoVxWoViewSet)
        erring_router.register("mx_so_vx_wo", err_viewsets.MxSoVxWoViewSet)
        erring_router.register("mo_sx_vx_wo", err_viewsets.MoSxVxWoViewSet)
        erring_router.register("mx_sx_vx_wo", err_viewsets.MxSxVxWoViewSet)
        erring_router.register("mo_so_vo_wx", err_viewsets.MoSoVoWxViewSet)
        erring_router.register("mx_so_vo_wx", err_viewsets.MxSoVoWxViewSet)
        erring_router.register("mo_sx_vo_wx", err_viewsets.MoSxVoWxViewSet)
        erring_router.register("mx_sx_vo_wx", err_viewsets.MxSxVoWxViewSet)
        erring_router.register("mo_so_vx_wx", err_viewsets.MoSoVxWxViewSet)
        erring_router.register("mx_so_vx_wx", err_viewsets.MxSoVxWxViewSet)
        erring_router.register("mo_sx_vx_wx", err_viewsets.MoSxVxWxViewSet)
        erring_router.register("mx_sx_vx_wx", err_viewsets.MxSxVxWxViewSet)

        urlpatterns.append(
            path("erring/", include(erring_router.urls)),
        )

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
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        self.setup_router_and_registry()

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
            assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, pformat(data)
            assert expected_error == frozenset(response.data["detail"])

        else:
            data = response.json()
            assert response.status_code == HTTPStatus.OK, pformat(data)
            # In this case the expected error is actually the results.
            assert expected_error == frozenset(data)
