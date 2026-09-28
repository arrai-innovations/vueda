"""
Regression test for the delete/create ordering in FlexFieldsWriteableNestedSerializerMixin.update.

When submitting nested (inline) data via multipart form encoding, DRF's parse_html_list()
builds a fresh list on every call to get_initial().  This means the pk mutation
(data['pk'] = related_instance.pk) written by update_or_create_reverse_relations into one
call's list does NOT appear in the list returned by the next call inside
delete_reverse_relations_if_need.

With the original drf_writable_nested order — create first, then delete — the newly
created objects are absent from current_ids and are therefore deleted immediately after
being created.  The fixed order (delete first, then create) avoids the problem entirely.
"""

from typing import ClassVar

import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework import status

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
from tests.store import models as store_models
from tests.utils import FakeRequest
from tests.utils import FakeView
from vueda.core.serializers import VuedaReadonlySerializer
from vueda.core.serializers import VuedaSerializer


@pytest.mark.django_db
class TestCreateIssueExpectedFailure:
    @pytest.mark.xfail(
        strict=True,
        reason=(
            "drf_writable_nested.NestedUpdateMixin runs update_or_create_reverse_relations "
            "before delete_reverse_relations_if_need. With multipart data, parse_html_list() "
            "returns a fresh list on each get_initial() call, so the pk mutation written by "
            "the create step is invisible to the delete step and newly created inline objects "
            "are immediately deleted. If this test unexpectedly passes, drf-writable-nested "
            "has fixed the issue, and the customized update function should no longer be needed."
            "https://github.com/arrai-innovations/vueda/blob/cf87918ce6c42409248d8fba0355cb0712f6aaa3/server/vueda/core/serializers/__init__.py#L160-L178"
        ),
    )
    def test_new_inline_survives_update_with_existing_inline(self, api_client):
        invoice = store_models.Invoice.objects.create(name="Test Invoice")
        existing_line = store_models.InvoiceLine.objects.create(
            invoice=invoice,
            name="Existing Line",
            amount="10.00",
        )
        url = reverse("store.invoice-base-detail", kwargs={"pk": invoice.pk})
        response = api_client.patch(
            url,
            data={
                "invoice_lines[0]id": str(existing_line.pk),
                "invoice_lines[0]name": existing_line.name,
                "invoice_lines[0]amount": str(existing_line.amount),
                "invoice_lines[1]name": "New Line",
                "invoice_lines[1]amount": "20.00",
            },
            format="multipart",
        )
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert store_models.InvoiceLine.objects.filter(invoice=invoice).count() == 2  # noqa: PLR2004


@pytest.mark.django_db
class TestNestedWriteHistoryAnnotation(BaseTestUserMixin, BaseTestGroupMixin):
    """
    A row written through a writable-nested field must publish its revision, not just one written
    through the view's own serializer. The write returns the instance it created, which carries no
    annotation, so the serializer re-reads it.
    """

    groups_to_create: ClassVar[dict] = {
        "Invoice Updater": [
            ("store", "Invoice", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "invoice_updater@domain.invalid": {
            "name": "Invoice Updater",
            "password": "testpass",
            "groups": ["Invoice Updater"],
        }
    }

    def test_new_nested_invoice_line_has_a_revision(self, api_client):
        user = self.users["invoice_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        invoice = store_models.Invoice.objects.create(name="Test Invoice")

        url = reverse("store.invoice-detail", kwargs={"pk": invoice.pk})
        response = api_client.patch(
            url,
            data={
                "invoice_lines[0]name": "New Line",
                "invoice_lines[0]amount": "20.00",
            },
            format="multipart",
        )
        assert response.status_code == status.HTTP_200_OK
        [line] = response.data["invoice_lines"]
        assert line["object_revision"] is not None


@pytest.mark.django_db
class TestCreateIssue(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Invoice Updater": [
            ("store", "Invoice", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "invoice_updater@domain.invalid": {
            "name": "Invoice Updater",
            "password": "testpass",
            "groups": ["Invoice Updater"],
        }
    }

    def test_new_inline_survives_update_with_existing_inline(self, api_client):
        """
        Submitting multipart data that keeps an existing inline AND adds a new one must
        leave both lines in the database.

        With the buggy (original) order:
          1. update_or_create_reverse_relations creates NewLine (pk=Y) and writes
             data['pk'] = Y into its own copy of the parsed list.
          2. delete_reverse_relations_if_need re-parses the QueryDict and gets a
             fresh list where NewLine still has no pk, so current_ids = [existing_pk].
             The query deletes everything whose pk is not in [existing_pk], which
             includes the just-created NewLine.

        With the fixed order (delete first):
          1. delete_reverse_relations_if_need sees current_ids = [existing_pk] and
             deletes nothing (no other lines exist yet).
          2. update_or_create_reverse_relations creates NewLine safely.
        """
        user = self.users["invoice_updater@domain.invalid"]
        api_client.force_authenticate(user=user)

        invoice = store_models.Invoice.objects.create(name="Test Invoice")
        existing_line = store_models.InvoiceLine.objects.create(
            invoice=invoice,
            name="Existing Line",
            amount="10.00",
        )

        url = reverse("store.invoice-detail", kwargs={"pk": invoice.pk})
        response = api_client.patch(
            url,
            data={
                # Keep the existing line by including its pk.
                "invoice_lines[0]id": str(existing_line.pk),
                "invoice_lines[0]name": existing_line.name,
                "invoice_lines[0]amount": str(existing_line.amount),
                # Add a brand-new line with no pk.
                "invoice_lines[1]name": "New Line",
                "invoice_lines[1]amount": "20.00",
            },
            format="multipart",
        )
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert store_models.InvoiceLine.objects.filter(invoice=invoice).count() == 2  # noqa: PLR2004


@pytest.mark.django_db
class TestNestedInlineRemoval(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Invoice Updater": [("store", "Invoice", "update"), ("store", "Invoice", "create")],
    }
    users_to_create: ClassVar[dict] = {
        "invoice_updater@domain.invalid": {
            "name": "Invoice Updater",
            "password": "testpass",
            "groups": ["Invoice Updater"],
        },
    }

    @pytest.mark.parametrize("kept_indexes", [[1], [], [0, 1]], ids=["remove-one", "remove-all", "clear-mark"])
    def test_parent_update_deletes_only_omitted_children(self, api_client, kept_indexes):
        api_client.force_authenticate(user=self.users["invoice_updater@domain.invalid"])
        invoice = store_models.Invoice.objects.create(name="Test Invoice")
        lines = [
            store_models.InvoiceLine.objects.create(invoice=invoice, name="First line", amount="10.00"),
            store_models.InvoiceLine.objects.create(invoice=invoice, name="Second line", amount="20.00"),
        ]
        other_invoice = store_models.Invoice.objects.create(name="Other Invoice")
        other_line = store_models.InvoiceLine.objects.create(invoice=other_invoice, name="Other line", amount="30.00")
        # Marking a row omits it from the array; clearing the mark includes it again.
        # This user can update the parent and has no child-model permissions.
        payload = {
            "invoice_lines": [
                {"id": lines[index].pk, "name": lines[index].name, "amount": str(lines[index].amount)}
                for index in kept_indexes
            ],
        }
        response = api_client.patch(
            reverse("store.invoice-detail", kwargs={"pk": invoice.pk}),
            data=payload,
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK, response_body(response)
        assert set(store_models.InvoiceLine.objects.filter(invoice=invoice).values_list("pk", flat=True)) == {
            lines[index].pk for index in kept_indexes
        }
        assert store_models.InvoiceLine.objects.filter(pk=other_line.pk).exists()

    def test_parent_update_leaves_another_parents_child_unchanged(self, api_client):
        """A child pk that belongs to another parent neither moves nor updates that row."""
        api_client.force_authenticate(user=self.users["invoice_updater@domain.invalid"])
        invoice = store_models.Invoice.objects.create(name="Test Invoice")
        other_invoice = store_models.Invoice.objects.create(name="Other Invoice")
        other_line = store_models.InvoiceLine.objects.create(invoice=other_invoice, name="Other line", amount="30.00")

        response = api_client.patch(
            reverse("store.invoice-detail", kwargs={"pk": invoice.pk}),
            data={"invoice_lines": [{"id": other_line.pk, "name": "Taken line", "amount": "1.00"}]},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response_body(response)
        other_line.refresh_from_db()
        assert other_line.invoice_id == other_invoice.pk
        assert other_line.name == "Other line"
        # The pk matches none of this parent's rows, so the entry saves as a new row here.
        assert list(store_models.InvoiceLine.objects.filter(invoice=invoice).values_list("name", flat=True)) == [
            "Taken line"
        ]

    def test_parent_create_leaves_another_parents_child_unchanged(self, api_client):
        """A create treats a child pk from another parent as a new row, and leaves that row alone."""
        api_client.force_authenticate(user=self.users["invoice_updater@domain.invalid"])
        other_invoice = store_models.Invoice.objects.create(name="Other Invoice")
        other_line = store_models.InvoiceLine.objects.create(invoice=other_invoice, name="Other line", amount="30.00")

        response = api_client.post(
            reverse("store.invoice-list"),
            data={
                "name": "New Invoice",
                "invoice_lines": [{"id": other_line.pk, "name": "Taken line", "amount": "1.00"}],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED, response_body(response)
        other_line.refresh_from_db()
        assert other_line.invoice_id == other_invoice.pk
        assert other_line.name == "Other line"


class _CustomerReadonlySerializer(VuedaReadonlySerializer):
    class Meta(VuedaReadonlySerializer.Meta):
        model = store_models.Customer
        fields = ["id", "user"] + VuedaSerializer.Meta.fields


class _CartWithReadonlyCustomerSerializer(VuedaSerializer):
    customer = _CustomerReadonlySerializer(required=False)

    class Meta(VuedaSerializer.Meta):
        model = store_models.Cart
        fields = ["id", "customer", "reserved_until"] + VuedaSerializer.Meta.fields


class _CartExpandingReadonlyCustomerSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = store_models.Cart
        fields = ["id", "customer", "reserved_until"] + VuedaSerializer.Meta.fields
        expandable_fields = {"customer": (_CustomerReadonlySerializer, {})}


@pytest.mark.django_db
class TestReadonlyForwardRelation(BaseTestUserMixin):
    """A read-only nested serializer on a forward foreign key never takes part in the save."""

    users_to_create: ClassVar[dict] = {
        "cart_owner@domain.invalid": {"name": "Cart Owner", "password": "testpass", "groups": []},
        "other_customer@domain.invalid": {"name": "Other Customer", "password": "testpass", "groups": []},
    }

    def _serializer(self, instance, data, method):
        request = FakeRequest({}, data, method)
        queryset = store_models.Cart.objects.filter(pk=instance.pk) if instance else None
        view = FakeView(request, _CartWithReadonlyCustomerSerializer, queryset=queryset)
        return _CartWithReadonlyCustomerSerializer(
            instance, data=data, partial=method == "PATCH", context={"request": request, "view": view}
        )

    @pytest.mark.parametrize(
        "sends_customer",
        [False, True],
        ids=["body-omits-relation", "body-sends-relation"],
    )
    def test_update_saves_and_keeps_the_foreign_key(self, sends_customer):
        customer = store_models.Customer.objects.create(user=self.users["cart_owner@domain.invalid"])
        other = store_models.Customer.objects.create(user=self.users["other_customer@domain.invalid"])
        cart = store_models.Cart.objects.create(customer=customer)
        data = {"reserved_until": "10:00"}
        if sends_customer:
            data["customer"] = {"id": other.pk}

        serializer = self._serializer(cart, data, "PATCH")
        assert serializer.is_valid(), serializer.errors
        serializer.save()

        cart.refresh_from_db()
        assert cart.customer_id == customer.pk
        assert str(cart.reserved_until) == "10:00:00"

    def test_create_keeps_a_foreign_key_passed_to_save(self):
        customer = store_models.Customer.objects.create(user=self.users["cart_owner@domain.invalid"])

        serializer = self._serializer(None, {"reserved_until": "10:00"}, "POST")
        assert serializer.is_valid(), serializer.errors
        cart = serializer.save(customer=customer)

        assert cart.customer_id == customer.pk

    def test_update_through_an_expanded_readonly_relation_keeps_the_foreign_key(self):
        customer = store_models.Customer.objects.create(user=self.users["cart_owner@domain.invalid"])
        cart = store_models.Cart.objects.create(customer=customer)
        data = {"reserved_until": "10:00"}
        request = FakeRequest({settings.REST_FLEX_FIELDS["EXPAND_PARAM"]: ["customer"]}, data, "PATCH")
        view = FakeView(
            request, _CartExpandingReadonlyCustomerSerializer, queryset=store_models.Cart.objects.filter(pk=cart.pk)
        )
        serializer = _CartExpandingReadonlyCustomerSerializer(
            cart, data=data, partial=True, context={"request": request, "view": view}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()

        cart.refresh_from_db()
        assert cart.customer_id == customer.pk
        assert str(cart.reserved_until) == "10:00:00"
