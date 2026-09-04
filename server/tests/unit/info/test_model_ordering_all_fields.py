from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import Product
from tests.product.serializers import ProductRenamedFieldSerializer
from tests.product.viewsets import ProductOrderingAllFieldsViewSet
from vueda import info


class ModelOrderingAllFieldsTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


@pytest.mark.django_db
class TestModelOrderingAllFieldsValue:
    """ProductOrderingAllFieldsViewSet sets `ordering_fields = "__all__"`, which DRF's OrderingFilter
    resolves against the model's own fields plus its queryset's annotations, not against the
    serializer. `model_ordering.fields` in the /vueda.info/ metadata should reflect that expansion
    instead of the literal string "__all__".
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductRenamedFieldSerializer, ProductOrderingAllFieldsViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_expands_to_model_fields_and_annotations(self, api_client, settings):
        test_data = ModelOrderingAllFieldsTestData()
        user = test_data.users["test_super_user@domain.invalid"]
        api_client.force_authenticate(user=user)

        response = api_client.get(
            reverse("info.model_info-detail", args=("product", "product")),
            data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
            format="json",
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        fields = response.data["model_ordering"]["fields"]
        field_names = {field["name"] for field in fields}

        # DRF's `"__all__"` reads `queryset.query.annotations` alongside the model's own fields, so
        # the expectation is built from those same two sources rather than from a hand-written list.
        # Every name in it is one `remove_invalid_fields` accepts, which is the property that matters:
        # metadata advertises exactly what `?o=` will honour.
        annotation_names = set(ProductOrderingAllFieldsViewSet().get_queryset().query.annotations)
        expected_field_names = {field.name for field in Product._meta.fields} | annotation_names
        assert field_names == expected_field_names, response_body(response)
        assert "__all__" not in field_names

        # The two annotations come from different places, and both count.
        #
        # "title" is added by this viewset's own `get_queryset`. It is also the serializer's name for
        # Product.name, but it is advertised because of the annotation, not because the serializer
        # exposes it. `?o=title` is accepted for the same reason, which
        # TestOrderingFieldsAllValue.test_explicit_ordering_param_on_annotated_serializer_field_name_is_applied
        # covers, so metadata and request-time behaviour agree there.
        #
        # "current_history_id" is added by `SimpleHistoryManager`, the default manager Product
        # inherits through VuedaHistoryModel. It is on every Product queryset before any viewset
        # touches it, so `"__all__"` picks it up too. A manager-added annotation is no different from
        # a viewset-added one as far as `order_by()` is concerned.
        assert {"title", "current_history_id"} <= field_names, response_body(response)
        assert "current_history_id" not in {field.name for field in Product._meta.fields}
