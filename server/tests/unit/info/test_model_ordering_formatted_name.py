from http import HTTPStatus
from typing import ClassVar

import pytest
from django.db import models
from django.urls import reverse

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.product.models import ProductModelOrderingFormattedName
from tests.product.models import ProductModelOrderingLookupFormattedName
from tests.product.serializers import ProductModelOrderingFormattedNameSerializer
from tests.product.serializers import ProductModelOrderingLookupFormattedNameSerializer
from tests.product.viewsets import ProductModelOrderingFormattedNameViewSet
from tests.product.viewsets import ProductModelOrderingLookupFormattedNameViewSet
from tests.store.models import Cart
from tests.store.models import CartItem
from tests.store.models import Customer
from tests.store.models import InventoryRecord
from tests.store.serializers import CartItemSerializer
from tests.store.serializers import CartSerializer
from tests.store.serializers import CustomerSerializer
from tests.store.viewsets import CartItemOrderingRelatedFormattedNameViewSet
from tests.store.viewsets import CartOrderingFormattedNameViewSet
from tests.store.viewsets import CartOrderingMultiValuedFormattedNameViewSet
from tests.store.viewsets import CartOrderingRelatedFormattedNameViewSet
from tests.store.viewsets import CustomerOrderingFormattedNameViewSet
from tests.store.viewsets import CustomerViewSet
from vueda import info
from vueda.core.models import FormattedNameManager


class ModelOrderingFormattedNameTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {}

    users_to_create: ClassVar[dict] = {
        "test_super_user@domain.invalid": {
            "name": "Test Super User",
            "password": "testpass",
            "is_superuser": True,
            "groups": [],
        },
    }


def get_model_ordering_response(api_client, settings, app_label, model_name):
    """The model-info response for a registered model, expanded onto `model_ordering`."""
    test_data = ModelOrderingFormattedNameTestData()
    user = test_data.users["test_super_user@domain.invalid"]
    api_client.force_authenticate(user=user)

    return api_client.get(
        reverse("info.model_info-detail", args=(app_label, model_name)),
        data={settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: "model_ordering"},
        format="json",
    )


def ordering_check_errors(model, ordering, monkeypatch):
    """The `models.E015` errors a model's checks report for a given `Meta.ordering`.

    Patched rather than declared so one shared model can stand in for several declarations. What the
    check reads is `_meta.ordering`, the same attribute a declared `Meta.ordering` populates, so a
    patched value exercises the same code path.
    """
    monkeypatch.setattr(model._meta, "ordering", ordering)

    return [error for error in model.check() if error.id == "models.E015"]


def use_default_manager(model, manager, monkeypatch):
    """Stand a different default manager in front of ``model`` for the duration of one test.

    ``_check_ordering`` reads ``_meta.default_manager`` to decide whether the `formatted_name`
    annotation will be there, which is the same attribute `Meta.default_manager_name` resolves to.
    Patched rather than declared because the models that reach a formatted name through a lookup
    expression are shared with the rest of the suite, and a model whose real default manager didn't
    annotate would report `models.E015` for every `manage.py check` the project runs.
    """
    manager.model = model
    monkeypatch.setattr(model._meta, "default_manager", manager)


@pytest.mark.django_db
class TestModelOrderingLookupExpressionFormattedName:
    """CustomerOrderingFormattedNameViewSet declares `ordering = ["formatted_name"]` on a model with
    no formatted_name column of its own. Customer reaches its formatted name through
    `formatted_name_lookup_expression = "data__formatted_name"`, which `VuedaViewSet.get_queryset`
    annotates onto the queryset under the name `formatted_name`, so the database can sort by it.

    The metadata should follow that lookup expression to describe the field, while still reporting it
    to the client as "formatted_name" — the name the client sends back in `?o=`.
    """

    @pytest.fixture(autouse=True)
    def register_customer(self):
        info.registration.get_empty_registry()
        info.register(CustomerSerializer, CustomerOrderingFormattedNameViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_formatted_name(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        # Not "data__formatted_name": the lookup expression is how the server reaches the value, not
        # something the client knows about or could send back.
        assert model_ordering["default"] == ["formatted_name"], response_body(response)

    def test_fields_carries_formatted_name_with_the_looked_up_type(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # The type comes from the field the lookup expression lands on (CustomerData.formatted_name,
        # a CharField), and `ascending` from its place in the default ordering.
        assert "data__formatted_name" not in fields_by_name, response_body(response)
        assert fields_by_name["formatted_name"] == {
            "name": "formatted_name",
            "type": "alpha",
            "ascending": True,
        }, response_body(response)

    def test_ordering_fields_entry_is_unaffected(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # "user__email" is only in `ordering_fields`, so it keeps the plain name/type shape.
        assert fields_by_name["user__email"] == {"name": "user__email", "type": "alpha"}, response_body(response)


@pytest.mark.django_db
class TestModelOrderingMethodBackedFormattedName:
    """CartOrderingFormattedNameViewSet orders by formatted_name on a model that computes it with a
    `get_formatted_name()` method. There is no column and no annotation for the database to sort by,
    and sorting in Python would mean loading every row, so the field isn't orderable at all.

    The metadata must not advertise it, nor report a default ordering built on it. This is an invalid
    configuration by design — the `vueda_info.E005` system check is what tells the developer.
    """

    @pytest.fixture(autouse=True)
    def register_cart(self):
        info.registration.get_empty_registry()
        info.register(CartSerializer, CartOrderingFormattedNameViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_is_dropped(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cart")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == [], response_body(response)

    def test_formatted_name_is_not_advertised_as_orderable(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cart")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        names = [field["name"] for field in model_ordering["fields"]]

        # `ordering_fields` names it, but it can't be ordered by, so it isn't reported.
        assert "formatted_name" not in names, response_body(response)

        # The rest of `ordering_fields` is still reported, so one unorderable entry doesn't cost the
        # client the fields it can use.
        assert "customer__user__email" in names, response_body(response)
        assert "last_modified" in names, response_body(response)


@pytest.mark.django_db
class TestModelOrderingDeclaredModelFormattedName:
    """ProductModelOrderingFormattedName declares `ordering = ["formatted_name"]` in its own `Meta`,
    and ProductModelOrderingFormattedNameViewSet declares no `ordering`, so the model's is what DRF
    applies.

    The value lives in a generated-field column, so Django resolves the term like any other field.
    TestModelOrderingDeclaredModelLookupExpressionFormattedName covers the same declaration over an
    annotation instead of a column; the metadata is expected to come out identical either way.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(ProductModelOrderingFormattedNameSerializer, ProductModelOrderingFormattedNameViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_formatted_name(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "productmodelorderingformattedname")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        assert model_ordering["default"] == ["formatted_name"], response_body(response)

    def test_fields_carries_formatted_name_with_the_generated_column_type(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "product", "productmodelorderingformattedname")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # A GeneratedField reports the internal type of its `output_field`, a CharField here.
        assert fields_by_name["formatted_name"] == {
            "name": "formatted_name",
            "type": "alpha",
            "ascending": True,
        }, response_body(response)

    def test_the_declaration_passes_djangos_own_checks(self):
        """A real column needs no help from `FormattedNameBaseModel._check_ordering`: this model has
        no `formatted_name_lookup_expression`, so nothing is withheld from `models.E015` and it passes
        on its own."""
        assert ProductModelOrderingFormattedName.check() == []


@pytest.mark.django_db
class TestModelOrderingModelFormattedNameLookupExpression:
    """A model-level ordering on a formatted_name reached through
    `formatted_name_lookup_expression`. Customer has no formatted_name column of its own, so
    `VuedaViewSet.get_queryset` annotates the lookup expression ("data__formatted_name") under that
    name and the database sorts by the annotation. CustomerViewSet declares no `ordering`, so the
    model's `Meta.ordering` is what DRF applies.

    `Meta.ordering` is patched rather than declared only to keep Customer's real default ordering out
    of it — the model is shared with the rest of the store tests. The declared form is covered on a
    dedicated model by TestModelOrderingDeclaredModelLookupExpressionFormattedName. What this class
    adds is a lookup expression that reaches through a relation into JSON ("data__formatted_name")
    rather than a plain local column, and the descending direction.
    """

    @pytest.fixture(autouse=True)
    def register_customer(self):
        info.registration.get_empty_registry()
        info.register(CustomerSerializer, CustomerViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_follows_the_lookup_expression(self, api_client, settings, monkeypatch):
        monkeypatch.setattr(Customer._meta, "ordering", ["formatted_name"])

        response = get_model_ordering_response(api_client, settings, "store", "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        # Reported as "formatted_name", the name the annotation carries and the client sends back in
        # `?o=`, not as the "data__formatted_name" path behind it.
        assert model_ordering["default"] == ["formatted_name"], response_body(response)

    def test_fields_carries_formatted_name_with_the_looked_up_type(self, api_client, settings, monkeypatch):
        monkeypatch.setattr(Customer._meta, "ordering", ["formatted_name"])

        response = get_model_ordering_response(api_client, settings, "store", "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        assert "data__formatted_name" not in fields_by_name, response_body(response)
        assert fields_by_name["formatted_name"] == {
            "name": "formatted_name",
            "type": "alpha",
            "ascending": True,
        }, response_body(response)

    def test_descending_keeps_its_direction(self, api_client, settings, monkeypatch):
        monkeypatch.setattr(Customer._meta, "ordering", ["-formatted_name"])

        response = get_model_ordering_response(api_client, settings, "store", "customer")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        assert model_ordering["default"] == ["formatted_name"], response_body(response)
        assert fields_by_name["formatted_name"]["ascending"] is False, response_body(response)


@pytest.mark.django_db
class TestModelOrderingDeclaredModelLookupExpressionFormattedName:
    """ProductModelOrderingLookupFormattedName declares its own default ordering on a formatted_name
    it reaches through `formatted_name_lookup_expression = "label"`, and
    ProductModelOrderingLookupFormattedNameViewSet declares no `ordering`, so the model's is what DRF
    applies. `VuedaViewSet.get_queryset` annotates the lookup expression under the name
    `formatted_name`, so that annotation is what the database sorts by.

    The declaration is the plain string "formatted_name", the same thing a model with a real
    formatted_name column would write. `models.E015` would reject it — the annotation isn't a field on
    the model — but `FormattedNameBaseModel._check_ordering` withholds that one term from Django on a
    model that has a lookup expression to reach it through. See
    TestDeclaredFormattedNameOrderingSystemChecks for what that override does and does not swallow.
    """

    @pytest.fixture(autouse=True)
    def register_product(self):
        info.registration.get_empty_registry()
        info.register(
            ProductModelOrderingLookupFormattedNameSerializer,
            ProductModelOrderingLookupFormattedNameViewSet,
        )
        yield
        info.registration.get_empty_registry()

    def test_default_names_formatted_name(self, api_client, settings):
        response = get_model_ordering_response(
            api_client, settings, "product", "productmodelorderinglookupformattedname"
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        # Not "label": the lookup expression is how the server reaches the value, not a name the
        # client knows or could send back in `?o=`.
        assert model_ordering["default"] == ["formatted_name"], response_body(response)

    def test_fields_carries_formatted_name_with_the_looked_up_type(self, api_client, settings):
        response = get_model_ordering_response(
            api_client, settings, "product", "productmodelorderinglookupformattedname"
        )

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # The type comes from the column the lookup expression lands on (label, a CharField), and
        # `ascending` from the direction of the term in the model's Meta.
        assert "label" not in fields_by_name, response_body(response)
        assert fields_by_name["formatted_name"] == {
            "name": "formatted_name",
            "type": "alpha",
            "ascending": True,
        }, response_body(response)

    def test_the_declaration_passes_djangos_own_checks(self):
        """The model has no formatted_name column, so this passing is `_check_ordering` doing its
        job — see TestDeclaredFormattedNameOrderingSystemChecks for the rest of that behaviour."""
        assert ProductModelOrderingLookupFormattedName.check() == []


@pytest.mark.django_db
class TestDeclaredFormattedNameOrderingSystemChecks:
    """`FormattedNameBaseModel._check_ordering` withholds one term from Django's `models.E015`: a
    `formatted_name` on a model that reaches the value through `formatted_name_lookup_expression`
    *and* whose default manager annotates it. Such a model has no formatted_name column, so the check
    would reject an ordering the database sorts perfectly well once the annotation is there.

    Everything else stays Django's to report. These pin down the edges of that, because a check that
    swallows more than the one term it means to would let real stale orderings through — the drift
    `models.E015` exists to catch.
    """

    def test_lookup_expression_formatted_name_is_accepted_descending(self, monkeypatch):
        """The `-` prefix is part of the term, not a different term, so a descending declaration has to
        be accepted the same way the ascending one the model declares for itself is."""
        errors = ordering_check_errors(ProductModelOrderingLookupFormattedName, ["-formatted_name"], monkeypatch)

        assert errors == []

    def test_a_stale_term_beside_it_is_still_reported(self, monkeypatch):
        """The term is withheld, not the whole declaration: a real field name and a nonexistent one in
        the same `Meta.ordering` are each judged on their own."""
        errors = ordering_check_errors(
            ProductModelOrderingLookupFormattedName,
            ["formatted_name", "label", "no_such_field"],
            monkeypatch,
        )

        assert [error.msg for error in errors] == [
            "'ordering' refers to the nonexistent field, related field, or lookup 'no_such_field'."
        ]

    @pytest.mark.parametrize(
        ("model", "term"),
        [
            # Cart computes its formatted name with `get_formatted_name()` and has no lookup
            # expression, so nothing annotates a column for the database to sort. `models.E015` is
            # right to reject it and the override leaves it alone; `vueda_info.E005` explains the fix.
            pytest.param(Cart, "formatted_name", id="method-backed"),
            # CartItem has a lookup expression of its own, but `cart__formatted_name` reaches Cart's
            # formatted_name, which a `get_formatted_name()` method computes in Python. Nothing can
            # reach it from a query at any number of hops, so it is broken wherever it is declared.
            pytest.param(CartItem, "cart__formatted_name", id="related-method-backed"),
            # The harder case, and the one that pins the override's edge: InventoryRecord has a lookup
            # expression of its own, so `_check_ordering` does enter the branch that withholds a term —
            # and must still not withhold this one. `order_item__formatted_name` reaches OrderItem,
            # which *also* has a lookup expression, so `VuedaOrderingFilter` and
            # `FormattedNamePathFilterSetMixin` rewrite it to `order_item__data__formatted_name` and it
            # works for a viewset's `ordering`, for `?o=`, and for a filter. A model's `Meta.ordering`
            # reaches none of those: it applies to every queryset, including the plain
            # `InventoryRecord.objects.all()` no backend ever touches.
            pytest.param(InventoryRecord, "order_item__formatted_name", id="related-lookup-expression"),
        ],
    )
    def test_a_term_the_override_must_not_withhold_is_still_reported(self, model, term, monkeypatch):
        """The override withholds only a model's own un-prefixed `formatted_name`, and only when a
        lookup expression and an annotating default manager can reach it. Each term below fails one of
        those conditions, so `models.E015` has to report it exactly as Django would."""
        errors = ordering_check_errors(model, [term], monkeypatch)

        assert [error.msg for error in errors] == [
            f"'ordering' refers to the nonexistent field, related field, or lookup '{term}'."
        ]

    def test_the_term_is_reported_when_the_default_manager_does_not_annotate(self, monkeypatch):
        """The suppression's own precondition. `FormattedNameManager` is what puts `formatted_name` on
        every queryset the model builds, so a model whose default manager doesn't inherit it has no
        annotation to sort by and `models.E015` is right about the term. Withholding it there would
        trade a startup error for a `FieldError` on every query — including in a management command,
        a data migration, or the admin, none of which go near `VuedaViewSet.get_queryset`.

        `vueda_info.E009` reports the manager too, but only for a registered model, so it can't be
        what makes this safe.
        """
        use_default_manager(ProductModelOrderingLookupFormattedName, models.Manager(), monkeypatch)

        errors = ordering_check_errors(ProductModelOrderingLookupFormattedName, ["formatted_name"], monkeypatch)

        assert [error.msg for error in errors] == [
            "'ordering' refers to the nonexistent field, related field, or lookup 'formatted_name'."
        ]

    def test_the_term_is_withheld_for_a_manager_that_inherits_the_annotating_one(self, monkeypatch):
        """The requirement is the annotation, not one exact manager class. A model is expected to
        subclass `FormattedNameManager` when it needs a manager of its own, so subclassing has to keep
        the suppression — otherwise the documented way to add a manager would break every
        `Meta.ordering` that names `formatted_name`."""

        class ArchivedAwareManager(FormattedNameManager):
            pass

        use_default_manager(ProductModelOrderingLookupFormattedName, ArchivedAwareManager(), monkeypatch)

        errors = ordering_check_errors(ProductModelOrderingLookupFormattedName, ["formatted_name"], monkeypatch)

        assert errors == []

    def test_a_stale_term_is_still_reported_when_the_default_manager_does_not_annotate(self, monkeypatch):
        """Nothing is withheld in this state, so the rest of the declaration is judged exactly as
        Django would judge it — one error per broken term, not one for the whole ordering."""
        use_default_manager(ProductModelOrderingLookupFormattedName, models.Manager(), monkeypatch)

        errors = ordering_check_errors(
            ProductModelOrderingLookupFormattedName,
            ["formatted_name", "label", "no_such_field"],
            monkeypatch,
        )

        assert frozenset(error.msg for error in errors) == {
            "'ordering' refers to the nonexistent field, related field, or lookup 'formatted_name'.",
            "'ordering' refers to the nonexistent field, related field, or lookup 'no_such_field'.",
        }

    def test_the_declared_ordering_survives_the_check(self, monkeypatch):
        """The override withholds the term by editing `_meta.ordering` for the duration of the call, so
        what everything downstream reads afterwards — the metadata, DRF's own default ordering — has to
        be the declaration as written."""
        declared = ["formatted_name", "label"]

        ordering_check_errors(ProductModelOrderingLookupFormattedName, declared, monkeypatch)

        assert ProductModelOrderingLookupFormattedName._meta.ordering == declared


@pytest.mark.django_db
class TestModelOrderingRelatedFormattedName:
    """CartOrderingRelatedFormattedNameViewSet orders by `Lower("customer__formatted_name")`: the
    formatted name of a related model rather than of the model being listed, read by a scalar function
    rather than named outright.

    Customer reaches its formatted name through `formatted_name_lookup_expression`, and
    `VuedaOrderingFilter` rewrites the path to the column behind it before the query runs, so the
    ordering is real and the metadata should advertise it — under the name the client sends, not the
    path the server resolves it to.

    The term is one Django accepts in `order_by()` but that carries neither a "-" prefix nor an
    `.asc()`/`.desc()` of its own, so the metadata has to read the field name out of the expression and
    treat the term as ascending, which is how such a term sorts.
    """

    @pytest.fixture(autouse=True)
    def register_cart(self):
        info.registration.get_empty_registry()
        info.register(CartSerializer, CartOrderingRelatedFormattedNameViewSet)
        yield
        info.registration.get_empty_registry()

    def test_default_names_the_related_formatted_name(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cart")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        # Not "customer__data__formatted_name": the lookup expression is how the server reaches the
        # value, not something the client knows about or could send back.
        assert model_ordering["default"] == ["customer__formatted_name"], response_body(response)

    def test_fields_carries_it_with_the_looked_up_type(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cart")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # The type comes from the column the lookup expression lands on (CustomerData.formatted_name,
        # a CharField), and `ascending` from its place in the default ordering — true here because a
        # bare expression sorts ascending. The entry exists at all only because the default ordering
        # names the field; `ordering_fields` doesn't list it.
        assert "customer__data__formatted_name" not in fields_by_name, response_body(response)
        assert fields_by_name["customer__formatted_name"] == {
            "name": "customer__formatted_name",
            "type": "alpha",
            "ascending": True,
        }, response_body(response)


@pytest.mark.django_db
class TestModelOrderingRelatedFormattedNameThatCannotBeFollowed:
    """CartItemOrderingRelatedFormattedNameViewSet offers formatted_name across two relations.

    `cart__customer__formatted_name` reaches Customer, which has a lookup expression, so the path is
    followed over both hops and advertised. `cart__formatted_name` reaches Cart, which computes its
    formatted name with a `get_formatted_name()` method — nothing for a query to reach at any number
    of hops, so it is left out and reported by `vueda_info.E006` instead.
    """

    @pytest.fixture(autouse=True)
    def register_cart_item(self):
        info.registration.get_empty_registry()
        info.register(CartItemSerializer, CartItemOrderingRelatedFormattedNameViewSet)
        yield
        info.registration.get_empty_registry()

    def test_a_multi_hop_path_is_advertised(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cartitem")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        fields_by_name = {field["name"]: field for field in model_ordering["fields"]}

        # No `ascending`: the viewset declares no `ordering`, so this is offered for explicit `?o=`
        # requests without being part of any default ordering.
        assert fields_by_name["cart__customer__formatted_name"] == {
            "name": "cart__customer__formatted_name",
            "type": "alpha",
        }, response_body(response)

    def test_a_method_backed_related_formatted_name_is_not_advertised(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cartitem")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        names = [field["name"] for field in model_ordering["fields"]]

        assert "cart__formatted_name" not in names, response_body(response)

        # The rest of `ordering_fields` survives, so one unusable entry doesn't cost the client the
        # fields it can use.
        assert "quantity" in names, response_body(response)


@pytest.mark.django_db
class TestModelOrderingMultiValuedRelatedFormattedName:
    """CartOrderingMultiValuedFormattedNameViewSet offers `cart_items__formatted_name`, which reaches
    CartItem across a reverse foreign key.

    CartItem has a lookup expression, so the path could be rewritten — but the join would produce a row
    per cart item and multiply the rows the list returns. The path is refused for that reason rather
    than followed, so the metadata leaves it out and `vueda_info.E006` reports it.
    """

    @pytest.fixture(autouse=True)
    def register_cart(self):
        info.registration.get_empty_registry()
        info.register(CartSerializer, CartOrderingMultiValuedFormattedNameViewSet)
        yield
        info.registration.get_empty_registry()

    def test_it_is_not_advertised(self, api_client, settings):
        response = get_model_ordering_response(api_client, settings, "store", "cart")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        model_ordering = response.data["model_ordering"]

        names = [field["name"] for field in model_ordering["fields"]]

        assert "cart_items__formatted_name" not in names, response_body(response)
        assert "last_modified" in names, response_body(response)
