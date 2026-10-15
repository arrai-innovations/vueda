from http import HTTPStatus
from typing import ClassVar

import pytest
from django.db import models
from django.db.models.functions import Lower
from django.test.utils import register_lookup
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.serializers import ProductModelOrderingLookupFormattedNameSerializer
from tests.product.serializers import ProductReleaseSerializer
from tests.product.viewsets import ProductModelOrderingLookupFormattedNameTransformViewSet
from tests.product.viewsets import ProductReleaseAnnotationDefaultViewSet
from tests.product.viewsets import ProductReleaseAnnotationTransformViewSet
from tests.product.viewsets import ProductReleaseDottedAnnotationViewSet
from tests.product.viewsets import ProductReleaseDottedJSONKeyViewSet
from tests.product.viewsets import ProductReleaseTransformDefaultViewSet
from tests.product.viewsets import ProductReleaseTransformFieldsViewSet
from tests.store.serializers import CartSerializer
from tests.store.viewsets import CartOrderingRelatedFormattedNameTransformViewSet
from vueda import info


class ModelOrderingTransformsTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


def get_model_ordering_response(api_client, settings, app_label="product", model_name="productrelease"):
    """The model-info response for a registered model, expanded onto `model_ordering`."""
    test_data = ModelOrderingTransformsTestData()
    user = test_data.users["test_super_user@domain.invalid"]
    api_client.force_authenticate(user=user)

    return api_client.get(
        reverse("info.model_info-detail", args=(app_label, model_name)),
        data={settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]: "model_ordering"},
        format="json",
    )


@pytest.mark.django_db
class TestModelOrderingTransformDefault:
    """ProductReleaseTransformDefaultViewSet declares `ordering = ["released__year", "-released__month"]`.

    Each term ends in a transform on a date/time column. The transform is part of the name that a
    client sends back in `?o=`, so each term is reported under its own dotted path and typed from the
    transform's output, which is a number.
    """

    @pytest.fixture(autouse=True)
    def register_product_release(self):
        info.registration.get_empty_registry()
        info.register(ProductReleaseSerializer, ProductReleaseTransformDefaultViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_each_transform_path(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["released.year", "released.month"], response_body(response)

    def test_fields_type_each_transform_path_as_a_number(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"] == [
            {"name": "released.year", "type": "numeric", "ascending": True},
            {"name": "released.month", "type": "numeric", "ascending": False},
        ], response_body(response)


@pytest.mark.django_db
class TestModelOrderingTransformFields:
    """ProductReleaseTransformFieldsViewSet offers `released__year`, the chain `released__date__year`,
    and the `JSONField` key `specs__rank` through `ordering_fields`, with `ordering = ["name"]`.

    Each path is typed from the output of the last transform it names. A year is a number, whether it
    comes straight from the date/time column or from the date taken out of it. A key on a `JSONField`
    is still JSON.
    """

    @pytest.fixture(autouse=True)
    def register_product_release(self):
        info.registration.get_empty_registry()
        info.register(ProductReleaseSerializer, ProductReleaseTransformFieldsViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_report_each_transform_path_typed_from_its_output(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"] == [
            {"name": "released.year", "type": "numeric"},
            {"name": "released.date.year", "type": "numeric"},
            {"name": "specs.rank", "type": "alpha"},
            {"name": "name", "type": "alpha", "ascending": True},
        ], response_body(response)

    def test_default_is_the_declared_ordering(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["name"], response_body(response)


@pytest.mark.django_db
class TestModelOrderingAnnotationTransform:
    """ProductReleaseAnnotationTransformViewSet offers `launched__year` through `ordering_fields`,
    where `launched` is an annotation that `get_queryset` adds over the date/time column.

    The path is reported under its dotted name and typed from the output of `year`, which is a
    number, rather than from the annotation, which is a date/time.
    """

    @pytest.fixture(autouse=True)
    def register_product_release(self):
        info.registration.get_empty_registry()
        info.register(ProductReleaseSerializer, ProductReleaseAnnotationTransformViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_type_the_annotation_transform_as_a_number(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"] == [
            {"name": "launched.year", "type": "numeric"},
            {"name": "name", "type": "alpha", "ascending": True},
        ], response_body(response)


@pytest.mark.django_db
class TestModelOrderingAnnotationDefault:
    """ProductReleaseAnnotationDefaultViewSet declares `ordering = ["-launched__year", "name_length"]`,
    where both names start with an annotation that `get_queryset` adds.

    The sort menu offers every name in `fields`, and the sort read-out shows `default`, so both are
    reported. They are typed from the annotations, as an annotation in `ordering_fields` is.
    """

    @pytest.fixture(autouse=True)
    def register_product_release(self):
        info.registration.get_empty_registry()
        info.register(ProductReleaseSerializer, ProductReleaseAnnotationDefaultViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_each_annotation_term(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["launched.year", "name_length"], response_body(response)

    def test_fields_type_each_annotation_term_with_its_direction(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"] == [
            {"name": "launched.year", "type": "numeric", "ascending": False},
            {"name": "name_length", "type": "numeric", "ascending": True},
        ], response_body(response)


@pytest.mark.django_db
class TestModelOrderingDottedJSONKey:
    """ProductReleaseDottedJSONKeyViewSet offers `name`, `specs__v1.2` and `specs__a,b`, two keys on a
    `JSONField` whose names contain a dot and a comma.

    No client could send either key: `specs.v1.2` reads back as `specs__v1__2`, and DRF splits
    `specs.a,b` into two terms. Both keys are left out, and the plain field beside them is still
    reported.
    """

    @pytest.fixture(autouse=True)
    def register_product_release(self):
        info.registration.get_empty_registry()
        info.register(ProductReleaseSerializer, ProductReleaseDottedJSONKeyViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_leave_out_the_dotted_key(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"] == [{"name": "name", "type": "alpha"}], response_body(response)


@pytest.mark.django_db
class TestModelOrderingDottedAnnotation:
    """ProductReleaseDottedAnnotationViewSet offers `name` and `v1.2`, an annotation whose name
    contains a dot.

    A client would send `?o=v1.2`, which reads back as `v1__2`, so no request can name the annotation.
    It is left out, and the plain field beside it is still reported.
    """

    @pytest.fixture(autouse=True)
    def register_product_release(self):
        info.registration.get_empty_registry()
        info.register(ProductReleaseSerializer, ProductReleaseDottedAnnotationViewSet)
        yield
        info.registration.get_empty_registry()

    def test_fields_leave_out_the_dotted_annotation(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings)

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["fields"] == [{"name": "name", "type": "alpha"}], response_body(response)


@pytest.mark.django_db
class TestModelOrderingLookupFormattedNameTransform:
    """ProductModelOrderingLookupFormattedNameTransformViewSet offers `formatted_name__lower` on a
    model that reaches `formatted_name` through `formatted_name_lookup_expression = "label"`.

    `lower` is a transform only once a project registers it, so each test registers `Lower` on
    `CharField`. The path is reported under the name the client sends, not the lookup expression
    behind it.
    """

    @pytest.fixture(autouse=True)
    def register_lookup_formatted_name(self):
        info.registration.get_empty_registry()
        info.register(
            ProductModelOrderingLookupFormattedNameSerializer,
            ProductModelOrderingLookupFormattedNameTransformViewSet,
        )
        with register_lookup(models.CharField, Lower):
            yield
        info.registration.get_empty_registry()

    def test_fields_report_the_transform_under_the_formatted_name(self, api_client, settings):
        response = get_model_ordering_response(
            api_client, settings, model_name="productmodelorderinglookupformattedname"
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}
        assert fields_by_name["formatted_name.lower"] == {"name": "formatted_name.lower", "type": "alpha"}, (
            response_body(response)
        )


@pytest.mark.django_db
class TestModelOrderingRelatedFormattedNameTransform:
    """CartOrderingRelatedFormattedNameTransformViewSet offers `customer__formatted_name__lower`.
    Customer reaches its formatted name through a lookup expression, so the transform is applied to
    the path behind it. The path is reported under the name the client sends.
    """

    @pytest.fixture(autouse=True)
    def register_cart(self):
        info.registration.get_empty_registry()
        info.register(CartSerializer, CartOrderingRelatedFormattedNameTransformViewSet)
        with register_lookup(models.CharField, Lower):
            yield
        info.registration.get_empty_registry()

    def test_fields_report_the_transform_under_the_related_formatted_name(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, app_label="store", model_name="cart")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}
        assert fields_by_name["customer.formatted_name.lower"] == {
            "name": "customer.formatted_name.lower",
            "type": "alpha",
        }, response_body(response)
