# Contains tests that we don't want to register routes/urls
# for by default, because they are designed to have issues.
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


class TestData(BaseTestUserMixin, BaseTestGroupMixin):
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
        return TestData()

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

    def test_no_expandable_field_data(self, test_data, api_client):
        user = test_data.users["test_customer_1@example.com"]
        api_client.force_authenticate(user=user)

        err_models.NoExpandableFieldsData.objects.create(name="Test")

        self.setup_router_and_registry()

        response = api_client.get(
            reverse(
                "info.model_info-detail",
                args=(
                    "erring",
                    "noexpandablefieldsdata",
                ),
            ),
            format="json",
            data={
                settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: [
                    "model_expands",
                ],
            },
        )

        assert response.status_code == 400, pformat(response.data)
        assert response.data["non_field_errors"] == [
            "No `expandable_fields_data` specified for field. Model info only knows automatically about fields expandable into serializers."
        ]

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

        assert response.status_code == 500, pformat(response.data)
        assert (
            "Cannot resolve keyword "
            "'formatted_name' into field. Choices are: id, "
            "relatedobjectsaremissingdata, the_name_field"
        ) in response.data["serverStack"]
