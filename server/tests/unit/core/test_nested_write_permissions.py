"""Related-row authorization for nested forward and many-to-many writes."""

from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import transaction
from rest_framework import serializers
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate

from tests.store import models
from vueda.core.serializers import VuedaSerializer
from vueda.core.viewsets import VuedaViewSet
from vueda.info import registration


pytestmark = pytest.mark.django_db
User = get_user_model()


class CustomerSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.Customer
        fields = ["id", "user"]


class UserSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = User
        fields = ["id", "email", "name"]


class SpecialCareSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = models.SpecialCare
        fields = ["id", "code", "field_that_contains_the_name"]


class CartSerializer(VuedaSerializer):
    customer = CustomerSerializer()

    class Meta(VuedaSerializer.Meta):
        model = models.Cart
        fields = ["id", "customer", "reserved_until"]


class CustomerWithUserSerializer(VuedaSerializer):
    user = UserSerializer()

    class Meta(VuedaSerializer.Meta):
        model = models.Customer
        fields = ["id", "user"]


class ProductSerializer(VuedaSerializer):
    special_care = SpecialCareSerializer(many=True)

    class Meta(VuedaSerializer.Meta):
        model = models.Product
        fields = ["id", "name", "distributor", "tangible_type", "order_between", "special_care"]


def grant(user, model, action):
    user.user_permissions.add(
        Permission.objects.get(
            content_type__app_label=model._meta.app_label,
            content_type__model=model._meta.model_name,
            codename=f"{action}_{model._meta.model_name}",
        )
    )
    for name in ("_perm_cache", "_user_perm_cache", "_group_perm_cache"):
        user.__dict__.pop(name, None)


def view_for(serializer):
    class ViewSet(VuedaViewSet):
        queryset = serializer.Meta.model.objects.all()
        serializer_class = serializer

    return ViewSet


def register_view(monkeypatch, serializer, view):
    monkeypatch.setitem(
        registration._registry,
        serializer.Meta.model._meta.label_lower,
        {
            "serializer": serializer,
            "viewset": view,
        },
    )


@pytest.fixture(params=["foreign-key", "one-to-one", "many-to-many"])
def case(request, monkeypatch):
    owner, victim, replacement = [
        User.objects.create_user(
            email=f"{name}@domain.invalid",
            name=name,
            password="testpass",
        )
        for name in ("owner", "victim", "replacement")
    ]
    customer = models.Customer.objects.create(user=owner)
    if request.param == "foreign-key":
        related = models.Customer.objects.create(user=victim)
        parent = models.Cart.objects.create(customer=customer)
        parent_serializer, related_serializer = CartSerializer, CustomerSerializer
        field = "customer"
        mutation = {"user": replacement.pk}
        parent_data = {"reserved_until": "10:00"}
    elif request.param == "one-to-one":
        related, parent = victim, customer
        parent_serializer, related_serializer = CustomerWithUserSerializer, UserSerializer
        field = "user"
        mutation = {"email": "changed@domain.invalid", "name": "Changed"}
        parent_data = {}
    else:
        related = models.SpecialCare.objects.create(code="original", field_that_contains_the_name="Original")
        distributor = models.Distributor.objects.create(name="Distributor", description="")
        tangible = models.TangibleType.objects.first()
        parent = models.Product.objects.create(
            distributor=distributor,
            tangible_type=tangible,
            name="Original",
            order_between=(1, 10),
        )
        other = models.Product.objects.create(
            distributor=distributor,
            tangible_type=tangible,
            name="Other",
            order_between=(1, 10),
        )
        other.special_care.add(related)
        parent_serializer, related_serializer = ProductSerializer, SpecialCareSerializer
        field = "special_care"
        mutation = {"code": "changed", "field_that_contains_the_name": "Changed"}
        parent_data = {
            "name": "Changed",
            "distributor": distributor.pk,
            "tangible_type": tangible.pk,
            "order_between": [1, 10],
        }
    related_view = view_for(related_serializer)
    register_view(monkeypatch, related_serializer, related_view)
    grant(owner, type(parent), "create")
    grant(owner, type(parent), "update")
    return SimpleNamespace(
        kind=request.param,
        user=owner,
        parent=parent,
        related=related,
        serializer=parent_serializer,
        view=view_for(parent_serializer),
        related_serializer=related_serializer,
        related_view=related_view,
        field=field,
        mutation=mutation,
        parent_data=parent_data,
    )


def submit(case, method, nested):
    payload = {**case.parent_data, case.field: [nested] if case.kind == "many-to-many" else nested}
    request = getattr(APIRequestFactory(), method)("/nested/", payload, format="json")
    force_authenticate(request, user=case.user)
    action = {"post": "create", "put": "update", "patch": "partial_update"}[method]
    kwargs = {} if method == "post" else {"pk": case.parent.pk}
    with transaction.atomic():
        return case.view.as_view({method: action})(request, **kwargs)


def rows(model):
    return list(model.objects.order_by("pk").values())


@pytest.mark.parametrize("method", ["post", "put", "patch"])
@pytest.mark.parametrize("operation", ["create", "update"])
@pytest.mark.parametrize("allowed", [False, True], ids=["denied", "allowed"])
def test_nested_mutation_requires_related_permission(case, method, operation, allowed):
    if allowed:
        grant(case.user, type(case.related), operation)
    data = dict(case.mutation)
    if operation == "update":
        data["id"] = case.related.pk
    parents_before, related_before = rows(type(case.parent)), rows(type(case.related))
    response = submit(case, method, data)
    if not allowed:
        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
        assert case.field in response.data
        assert rows(type(case.parent)) == parents_before
        assert rows(type(case.related)) == related_before
    else:
        assert response.status_code == (status.HTTP_201_CREATED if method == "post" else status.HTTP_200_OK), (
            response.data
        )
        saved_parent = type(case.parent).objects.get(pk=response.data["id"])
        saved_related = getattr(saved_parent, case.field)
        if case.kind == "many-to-many":
            saved_related = saved_related.get()
        assert saved_related.pk == case.related.pk if operation == "update" else saved_related.pk != case.related.pk
        for name, value in case.mutation.items():
            assert getattr(saved_related, f"{name}_id" if name == "user" else name) == value


@pytest.mark.parametrize("method", ["post", "put", "patch"])
def test_pk_only_links_without_running_save_hooks(case, method, monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("A pk-only link must not call the related serializer's save")

    monkeypatch.setattr(case.related_serializer, "save", forbidden)
    before = rows(type(case.related))
    response = submit(case, method, {"id": case.related.pk})
    assert response.status_code == (status.HTTP_201_CREATED if method == "post" else status.HTTP_200_OK), response.data
    parent = type(case.parent).objects.get(pk=response.data["id"])
    related = getattr(parent, case.field)
    assert (related.get().pk if case.kind == "many-to-many" else related.pk) == case.related.pk
    assert rows(type(case.related)) == before


@pytest.mark.parametrize("pk_only", [False, True])
def test_unknown_pk_never_creates_a_related_row(case, pk_only):
    grant(case.user, type(case.related), "create")
    grant(case.user, type(case.related), "update")
    before = rows(type(case.related))
    response = submit(case, "patch", {"id": 99999999, **({} if pk_only else case.mutation)})
    assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
    assert case.field in response.data
    assert rows(type(case.related)) == before


@pytest.mark.parametrize("authority", ["missing", "serializer-only", "no-update-action"])
@pytest.mark.parametrize("pk_only", [False, True])
def test_missing_write_authority_allows_only_links(case, monkeypatch, authority, pk_only):
    grant(case.user, type(case.related), "update")
    key = case.related._meta.label_lower
    if authority == "missing":
        monkeypatch.delitem(registration._registry, key)
    elif authority == "serializer-only":
        register_view(monkeypatch, case.related_serializer, None)
    else:
        monkeypatch.setattr(case.related_view, "update", None)
    before = rows(type(case.related))
    response = submit(case, "patch", {"id": case.related.pk, **({} if pk_only else case.mutation)})
    assert response.status_code == (status.HTTP_200_OK if pk_only else status.HTTP_400_BAD_REQUEST), response.data
    assert rows(type(case.related)) == before


def test_related_object_denial_is_enforced(case, monkeypatch):
    grant(case.user, type(case.related), "update")
    calls = []

    def deny(view, request, instance):
        calls.append((view.action, request.method, instance.pk))
        raise PermissionDenied("Denied related object")

    monkeypatch.setattr(case.related_view, "check_object_permissions", deny)
    before = rows(type(case.related))
    response = submit(case, "patch", {"id": case.related.pk, **case.mutation})
    assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
    assert calls == [("update", "PUT", case.related.pk)]
    assert rows(type(case.related)) == before


def test_related_viewset_selects_permissions_for_its_own_action(case, monkeypatch):
    class DenyUpdate(BasePermission):
        def has_permission(self, request, view):
            assert view.action == "update"
            assert request.method == "PUT"
            assert request.data["id"] == case.related.pk
            return False

    def get_permissions(view):
        return [DenyUpdate()] if view.action == "update" else []

    monkeypatch.setattr(case.related_view, "get_permissions", get_permissions)
    response = submit(case, "patch", {"id": case.related.pk, **case.mutation})
    assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data


@pytest.fixture
def deep_cart(monkeypatch):
    class DeepCartSerializer(CartSerializer):
        customer = CustomerWithUserSerializer()

    actor = User.objects.create_user(email="actor@domain.invalid", name="Actor", password="testpass")
    customer = models.Customer.objects.create(user=actor)
    cart = models.Cart.objects.create(customer=customer)
    grant(actor, models.Cart, "update")
    grant(actor, models.Customer, "update")
    register_view(monkeypatch, CustomerWithUserSerializer, view_for(CustomerWithUserSerializer))
    register_view(monkeypatch, UserSerializer, view_for(UserSerializer))
    return SimpleNamespace(
        kind="foreign-key",
        user=actor,
        parent=cart,
        field="customer",
        parent_data={},
        view=view_for(DeepCartSerializer),
    )


@pytest.mark.parametrize("allowed", [False, True])
def test_deeper_nested_mutation_uses_the_deepest_models_permissions(deep_cart, allowed):
    if allowed:
        grant(deep_cart.user, User, "update")
    original = deep_cart.user.name
    response = submit(
        deep_cart,
        "patch",
        {
            "id": deep_cart.parent.customer_id,
            "user": {"id": deep_cart.user.pk, "name": "Changed"},
        },
    )
    deep_cart.user.refresh_from_db()
    assert response.status_code == (status.HTTP_200_OK if allowed else status.HTTP_400_BAD_REQUEST), response.data
    assert deep_cart.user.name == ("Changed" if allowed else original)
    if not allowed:
        assert "user" in response.data["customer"]


@pytest.mark.parametrize("method", ["post", "patch"])
def test_late_many_to_many_denial_rolls_back_parent_rows_and_links(monkeypatch, method):
    actor = User.objects.create_user(email="actor@domain.invalid", name="Actor", password="testpass")
    distributor = models.Distributor.objects.create(name="Distributor", description="")
    tangible = models.TangibleType.objects.first()
    product = models.Product.objects.create(
        distributor=distributor,
        tangible_type=tangible,
        name="Original",
        order_between=(1, 10),
    )
    first = models.SpecialCare.objects.create(code="first")
    denied = models.SpecialCare.objects.create(code="denied")
    removed = models.SpecialCare.objects.create(code="removed")
    product.special_care.add(removed)
    for action in ("create", "update"):
        grant(actor, models.Product, action)
        grant(actor, models.SpecialCare, action)
    related_view = view_for(SpecialCareSerializer)
    checks = []

    def check_objects(view, request, instance):
        if instance.pk == denied.pk:
            # Prove this denial occurs after the preceding row and the parent were saved.
            assert models.SpecialCare.objects.get(pk=first.pk).field_that_contains_the_name == "Changed"
            assert models.Product.objects.filter(name="Changed").exists()
            checks.append(instance.pk)
            raise PermissionDenied("Second row denied")

    monkeypatch.setattr(related_view, "check_object_permissions", check_objects)
    register_view(monkeypatch, SpecialCareSerializer, related_view)
    parents_before, related_before = rows(models.Product), rows(models.SpecialCare)
    payload = {
        "name": "Changed",
        "distributor": distributor.pk,
        "tangible_type": tangible.pk,
        "order_between": [1, 10],
        "special_care": [
            {"id": first.pk, "code": first.code, "field_that_contains_the_name": "Changed"},
            {"id": denied.pk, "code": denied.code, "field_that_contains_the_name": "Denied"},
        ],
    }
    request = getattr(APIRequestFactory(), method)("/nested/", payload, format="json")
    force_authenticate(request, user=actor)
    with transaction.atomic():
        response = view_for(ProductSerializer).as_view({method: "create" if method == "post" else "partial_update"})(
            request,
            **({} if method == "post" else {"pk": product.pk}),
        )
    assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
    assert checks == [denied.pk]
    assert response.data["special_care"][0] == {}
    assert response.data["special_care"][1]
    assert rows(models.Product) == parents_before
    assert rows(models.SpecialCare) == related_before
    assert list(product.special_care.values_list("pk", flat=True)) == [removed.pk]


@pytest.mark.parametrize("mode", ["grant", "deny", "other-state"])
def test_nested_write_honors_related_workflow_state(monkeypatch, mode):
    from django.contrib.auth.models import Group

    from vueda.workflow.models import State
    from vueda.workflow.models import StatePermission

    actor = User.objects.create_user(email="actor@domain.invalid", name="Actor", password="testpass")
    group = Group.objects.create(name="Nested order writers")
    actor.groups.add(group)
    customer = models.Customer.objects.create(user=actor)
    order = models.CustomerOrder.objects.create(
        customer=customer,
        order_state=models.OrderState.objects.get(code="new"),
        order_number=425,
        shipping_method="free",
    )
    distributor = models.Distributor.objects.create(name="Distributor", description="")
    product = models.Product.objects.create(
        distributor=distributor,
        tangible_type=models.TangibleType.objects.first(),
        name="Product",
        order_between=(1, 10),
    )
    option = models.ProductOption.objects.create(product=product, name="Option", sku="nested", gtin="nested")
    item = models.OrderItem.objects.create(customer_order=order, product_option=option, quantity=1)
    grant(actor, models.OrderItem, "update")
    if mode == "deny":
        grant(actor, models.CustomerOrder, "update")
    StatePermission.objects.filter(state__workflow=order.workflow).delete()
    StatePermission.objects.create(
        state=State.objects.get(workflow=order.workflow, code="packed" if mode == "other-state" else "new"),
        permission=Permission.objects.get(content_type=order.get_content_type(), codename="update_customerorder"),
        group=group,
        grant_or_deny=mode != "deny",
    )

    class OrderSerializer(VuedaSerializer):
        class Meta(VuedaSerializer.Meta):
            model = models.CustomerOrder
            fields = ["id", "shipping_method"]

    class ItemSerializer(VuedaSerializer):
        customer_order = OrderSerializer()

        class Meta(VuedaSerializer.Meta):
            model = models.OrderItem
            fields = ["id", "customer_order", "quantity"]

    register_view(monkeypatch, OrderSerializer, view_for(OrderSerializer))
    request = APIRequestFactory().patch(
        "/nested/",
        {
            "quantity": 2,
            "customer_order": {"id": order.pk, "shipping_method": "regular"},
        },
        format="json",
    )
    force_authenticate(request, user=actor)
    with transaction.atomic():
        response = view_for(ItemSerializer).as_view({"patch": "partial_update"})(request, pk=item.pk)
    assert response.status_code == (status.HTTP_200_OK if mode == "grant" else status.HTTP_400_BAD_REQUEST), (
        response.data
    )
    order.refresh_from_db()
    item.refresh_from_db()
    assert order.shipping_method == ("regular" if mode == "grant" else "free")
    assert item.quantity == (2 if mode == "grant" else 1)


def test_missing_request_cannot_authorize_a_nested_mutation(case):
    grant(case.user, type(case.related), "update")
    view = case.view()
    view.action = "update"
    data = {"id": case.related.pk, **case.mutation}
    serializer = case.serializer(
        case.parent,
        data={case.field: [data] if case.kind == "many-to-many" else data},
        partial=True,
        context={"view": view},
    )
    assert serializer.is_valid(), serializer.errors
    parents_before, related_before = rows(type(case.parent)), rows(type(case.related))
    with pytest.raises(serializers.ValidationError):
        serializer.save()
    assert rows(type(case.parent)) == parents_before
    assert rows(type(case.related)) == related_before


def test_plain_drf_child_pk_only_link_on_create(case, monkeypatch):
    original = case.related_serializer

    class PlainSerializer(serializers.ModelSerializer):
        class Meta:
            model = original.Meta.model
            fields = original.Meta.fields

        def save(self, **kwargs):
            pytest.fail("A pk-only link must not call save on a plain DRF child either")

    nested_field = PlainSerializer(many=case.kind == "many-to-many")
    parent = type("PlainChildParentSerializer", (case.serializer,), {case.field: nested_field})
    case.view = view_for(parent)
    response = submit(case, "post", {"id": case.related.pk})
    assert response.status_code == status.HTTP_201_CREATED, response.data


@pytest.mark.parametrize("case", ["foreign-key"], indirect=True)
@pytest.mark.parametrize("allowed", [False, True])
def test_expanded_customer_on_the_cart_route(case, api_client, allowed):
    from django.urls import reverse

    if allowed:
        grant(case.user, models.Customer, "update")
    api_client.force_authenticate(case.user)
    before = rows(models.Customer)
    response = api_client.patch(
        reverse("store.cart-detail", kwargs={"pk": case.parent.pk}) + "?e=customer",
        {"customer": {"id": case.related.pk, **case.mutation}},
        format="json",
    )
    assert response.status_code == (status.HTTP_200_OK if allowed else status.HTTP_400_BAD_REQUEST), response.data
    if not allowed:
        assert rows(models.Customer) == before
    else:
        case.parent.refresh_from_db()
        assert case.parent.customer_id == case.related.pk
        assert case.parent.customer.user_id == case.mutation["user"]


def test_related_queryset_restrictions_block_mutations_but_not_links(case, monkeypatch):
    grant(case.user, type(case.related), "update")
    monkeypatch.setattr(case.related_view, "queryset", type(case.related).objects.exclude(pk=case.related.pk))
    before = rows(type(case.related))
    response = submit(case, "patch", {"id": case.related.pk, **case.mutation})
    assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
    assert rows(type(case.related)) == before
    response = submit(case, "patch", {"id": case.related.pk})
    assert response.status_code == status.HTTP_200_OK, response.data
