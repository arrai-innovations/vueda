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
from django.urls import reverse
from rest_framework import status

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models


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
        assert response.status_code == status.HTTP_200_OK
        assert store_models.InvoiceLine.objects.filter(invoice=invoice).count() == 2  # noqa: PLR2004


@pytest.mark.django_db
class TestCreateIssue(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Invoice Updater": [
            ("store", "Invoice", "update"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "invoice_updater@example.com": {
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
        user = self.users["invoice_updater@example.com"]
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
        assert response.status_code == status.HTTP_200_OK
        assert store_models.InvoiceLine.objects.filter(invoice=invoice).count() == 2  # noqa: PLR2004
