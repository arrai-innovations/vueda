"""Viewset tests for the 'current' and 'history-list' actions on store models.

Code paths covered in SimpleHistoryViewSetMixin.history_list
------------------------------------------------------------
* previous_entry is None (single-page result, first/only entry):
      different_fields = [], delta = None → num_changes = 0, no 'changes' key.
* previous_entry is not None, delta.changed_fields is non-empty:
      'if different_fields:' branch builds the changes list.
  - scalar fields: the non-FK 'else' branch inside the changes loop.
  - FK fields (foreign_keys_are_objs=True): the 'if hasattr(_meta)' branch;
        model instances are rendered using formatted_name.
* previous_entry is not None, delta.changed_fields is empty:
      'elif delta:' branch — ModelDelta is always truthy even with no changed
      fields — records a synthetic 'related object updated' entry.
* has_next() True: previous_entry is pre-fetched from the next page.
* history_user not None: looked up, added to cache, resolved on subsequent hits.
* history_user is None: left as None in the response.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _set_history_user(instance, user):
    """Set ``_history_user`` on *instance* so simple-history records *user*."""
    instance._history_user = user


# ---------------------------------------------------------------------------
# 'current' action
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestStoreDistributorCurrentAction(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Distributor Reader": [
            ("store", "Distributor", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_reader@domain.invalid": {
            "name": "Test Reader",
            "password": "testpass",
            "groups": ["Distributor Reader"],
        },
    }

    @pytest.fixture
    def reader_client(self, api_client):
        user = self.users["test_reader@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def distributor(self):
        return store_models.Distributor.objects.create(
            name="Widget Co.",
            description="Fine widgets since 1984.",
        )

    def _current_url(self, pk):
        return reverse("store.distributor-current", kwargs={"pk": pk})

    def test_current_returns_true_for_latest_history_id(self, reader_client, distributor):
        """Querying current with the most-recent history_id returns {"current": true}."""
        annotated = store_models.Distributor.objects.get(pk=distributor.pk)
        current_history_id = annotated.current_history_id

        response = reader_client.get(
            self._current_url(distributor.pk),
            data={"history_id": current_history_id},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data == {"current": True}

    def test_current_returns_false_for_stale_history_id(self, reader_client, distributor):
        """Querying current with an older history_id returns {"current": false}."""
        annotated_before = store_models.Distributor.objects.get(pk=distributor.pk)
        old_history_id = annotated_before.current_history_id

        # Trigger a new history entry.
        distributor.name = "Widget Co. Updated"
        distributor.save()

        response = reader_client.get(
            self._current_url(distributor.pk),
            data={"history_id": old_history_id},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data == {"current": False}

    def test_current_requires_authentication(self, api_client, distributor):
        """Un-authenticated requests are rejected."""
        annotated = store_models.Distributor.objects.get(pk=distributor.pk)
        response = api_client.get(
            self._current_url(distributor.pk),
            data={"history_id": annotated.current_history_id},
        )
        assert response.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED), response.data


# ---------------------------------------------------------------------------
# 'history-list' action — Distributor (scalar fields only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestStoreDistributorHistoryList(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """Tests history-list for a Distributor (scalar name + description fields)."""

    groups_to_create: ClassVar[dict] = {
        "Distributor Reader": [
            ("store", "Distributor", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_reader@domain.invalid": {
            "name": "Test Reader",
            "password": "testpass",
            "groups": ["Distributor Reader"],
        },
    }

    @pytest.fixture
    def reader_client(self, api_client):
        user = self.users["test_reader@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    def _history_list_url(self, pk):
        return reverse("store.distributor-history-list", kwargs={"pk": pk})

    # ------------------------------------------------------------------
    # Path: previous_entry is None (no next page, single entry)
    # ------------------------------------------------------------------

    def test_history_list_single_entry_has_no_changes(self, reader_client):
        """
        When there is only one history entry, previous_entry stays None throughout
        the loop.  Both 'if different_fields:' and 'elif delta:' are False so the
        entry records num_changes=0 and no 'changes' key is added.
        """
        distributor = store_models.Distributor.objects.create(
            name="Solo Corp.",
            description="Just one history entry.",
        )

        response = reader_client.get(self._history_list_url(distributor.pk))

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 1
        entry = response.data["results"][0]
        assert entry["num_changes"] == 0
        assert "changes" not in entry
        assert entry["history_type"] == "+"
        assert entry["history_relation"] == distributor.pk

    # ------------------------------------------------------------------
    # Path: 'if different_fields:' branch — scalar values (non-FK 'else')
    # ------------------------------------------------------------------

    def test_history_list_scalar_field_changes(self, reader_client):
        """
        When tracked scalar fields change, diff_against returns a non-empty
        changed_fields list.  The 'if different_fields:' branch fires and the
        non-FK 'else' block inside the changes loop stores raw old/new values.
        """
        distributor = store_models.Distributor.objects.create(
            name="Original Name",
            description="Original description.",
        )
        distributor.name = "Updated Name"
        distributor.description = "Updated description."
        distributor.save()

        response = reader_client.get(self._history_list_url(distributor.pk))

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        # Results are returned newest-first.
        latest_entry = response.data["results"][0]
        assert latest_entry["history_type"] == "~"
        assert latest_entry["num_changes"] == 2  # noqa: PLR2004 - name + description

        changes = latest_entry["changes"]
        assert len(changes) == 2  # noqa: PLR2004
        changed_fields = {c["field"] for c in changes}
        assert changed_fields == {"name", "description"}

        name_change = next(c for c in changes if c["field"] == "name")
        assert name_change["old"] == "Original Name"
        assert name_change["new"] == "Updated Name"

        description_change = next(c for c in changes if c["field"] == "description")
        assert description_change["old"] == "Original description."
        assert description_change["new"] == "Updated description."

        # The creation entry has no changes.
        creation_entry = response.data["results"][1]
        assert creation_entry["history_type"] == "+"
        assert creation_entry["num_changes"] == 0
        assert "changes" not in creation_entry

    # ------------------------------------------------------------------
    # Path: 'elif delta:' branch — no changed fields but delta is truthy
    # ------------------------------------------------------------------

    def test_history_list_no_changed_fields_produces_related_object_updated(self, reader_client):
        """
        When an object is saved without modifying any tracked fields,
        diff_against returns a ModelDelta whose changed_fields is empty.  The
        ModelDelta object itself is always truthy so the 'elif delta:' branch
        fires, inserting a synthetic 'related object updated' entry with
        num_changes=1.
        """
        distributor = store_models.Distributor.objects.create(
            name="No-Change Corp.",
            description="Same values on second save.",
        )
        # Save without modifying fields; simple-history still creates a history entry.
        distributor.save()

        response = reader_client.get(self._history_list_url(distributor.pk))

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        # The newest entry (second save, no field changes) is first in the list.
        no_change_entry = response.data["results"][0]
        assert no_change_entry["history_type"] == "~"
        assert no_change_entry["num_changes"] == 1
        assert "changes" in no_change_entry
        assert len(no_change_entry["changes"]) == 1
        synthetic = no_change_entry["changes"][0]
        assert synthetic["field"] == "related object updated"
        assert synthetic["new"] == ""
        assert synthetic["old"] == ""

    # ------------------------------------------------------------------
    # Path: history_user is not None — user resolved via cache
    # ------------------------------------------------------------------

    def test_history_list_history_user_resolved_and_cached(self, reader_client):
        """
        When history_user is set, the endpoint resolves the user pk to
        formatted_name (email in this project) and caches the result.

        Two consecutive entries by the same user exercise both the cache-miss
        (first lookup) and cache-hit (second lookup) code paths.
        """
        user = self.users["test_reader@domain.invalid"]

        # Create the object with a tracked user using simple-history's
        # _history_user attribute to bypass the need for a real request.
        distributor = store_models.Distributor(
            name="Cached User Corp.",
            description="Testing user resolution.",
        )
        _set_history_user(distributor, user)
        distributor.save()

        # Second entry by the same user → exercises the cache-hit path.
        distributor.name = "Cached User Corp. v2"
        _set_history_user(distributor, user)
        distributor.save()

        response = reader_client.get(self._history_list_url(distributor.pk))

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        for entry in response.data["results"]:
            assert isinstance(entry["history_user"], str), (
                f"history_user should be resolved to a string, got: {entry['history_user']!r}"
            )
            assert entry["history_user"] == user.formatted_name

    # ------------------------------------------------------------------
    # Path: history_user is None
    # ------------------------------------------------------------------

    def test_history_list_null_history_user_remains_null(self, reader_client):
        """
        When objects are created directly via the ORM with no request context,
        simple-history records history_user=None.  The endpoint must leave it as
        None rather than attempting a lookup.
        """
        distributor = store_models.Distributor.objects.create(
            name="Anon Corp.",
            description="Created without a request user.",
        )

        response = reader_client.get(self._history_list_url(distributor.pk))

        self.assert_response(response, HTTPStatus.OK)
        entry = response.data["results"][0]
        assert entry["history_user"] is None

    # ------------------------------------------------------------------
    # Path: has_next() is True — previous_entry read from next page
    # ------------------------------------------------------------------

    def test_history_list_pagination_reads_previous_entry_from_next_page(self, reader_client):
        """
        When there are more history entries than fit on the first page, the
        endpoint sets previous_entry by looking ahead to the next page so that
        the oldest entry on page 1 can be diffed against its immediately
        preceding record (not an earlier one).

        Three revisions with page_size=1:
          history[0] v3 (newest)  — page 1
          history[1] v2 (middle)  — page 2
          history[2] v1 (oldest)  — page 3

        Page 1 must diff v3 against v2, not v3 against v1.
        Page 2 must diff v2 against v1, not raise an IndexError (HTTP 500).

        This covers:
        - The 'if self.paginator.page.has_next():' branch.
        - The 'previous_entry = history_queryset[next_page.start_index() - 1]'
          line (Page.start_index() is 1-based; the fix subtracts 1 before using
          it as a 0-based queryset index).
        """
        distributor = store_models.Distributor.objects.create(
            name="Paged Corp. v1",
            description="First version.",
        )
        distributor.name = "Paged Corp. v2"
        distributor.save()
        distributor.name = "Paged Corp. v3"
        distributor.save()
        # Three entries: one create + two updates.

        # ---- page 1 ----
        response = reader_client.get(
            self._history_list_url(distributor.pk),
            data={"ps": 1},
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 3  # noqa: PLR2004
        assert response.data["totalPages"] == 3  # noqa: PLR2004
        assert response.data["perPage"] == 1
        assert len(response.data["results"]) == 1

        # The result is v3 diffed against its immediate predecessor v2.
        entry = response.data["results"][0]
        assert entry["history_type"] == "~"
        assert "changes" in entry
        assert entry["num_changes"] == 1
        name_change = next(c for c in entry["changes"] if c["field"] == "name")
        assert name_change["old"] == "Paged Corp. v2"
        assert name_change["new"] == "Paged Corp. v3"

        # ---- page 2 ----
        # With the off-by-one bug, next_page.start_index() = 3 causes
        # history_queryset[3] → IndexError → HTTP 500.  With the fix it
        # correctly reads history_queryset[2] (v1) and returns HTTP 200.
        response2 = reader_client.get(
            self._history_list_url(distributor.pk),
            data={"ps": 1, "p": 2},
        )

        self.assert_response(response2, HTTPStatus.OK)
        assert len(response2.data["results"]) == 1

        entry2 = response2.data["results"][0]
        assert entry2["history_type"] == "~"
        assert "changes" in entry2
        assert entry2["num_changes"] == 1
        name_change2 = next(c for c in entry2["changes"] if c["field"] == "name")
        assert name_change2["old"] == "Paged Corp. v1"
        assert name_change2["new"] == "Paged Corp. v2"

    def test_history_list_requires_authentication(self, api_client):
        """Un-authenticated requests are rejected."""
        distributor = store_models.Distributor.objects.create(
            name="Auth Check Corp.",
            description="Testing auth on history-list.",
        )
        response = api_client.get(self._history_list_url(distributor.pk))
        assert response.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED), response.data


# ---------------------------------------------------------------------------
# 'history-list' action — ProductOption (FK fields)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestStoreProductOptionHistoryListFKChanges(BaseTestAssertResponseMixin, BaseTestUserMixin, BaseTestGroupMixin):
    """
    Tests history-list for a model whose FK field changes between saves.

    Covers the 'if hasattr(change.new, "_meta") or hasattr(change.old, "_meta"):'
    branch (lines 99-110 of history/viewsets.py) where FK values are rendered via
    formatted_name when the related object is a live model instance.
    """

    groups_to_create: ClassVar[dict] = {
        "Product Option Reader": [
            ("store", "ProductOption", "read"),
        ],
    }

    users_to_create: ClassVar[dict] = {
        "test_po_reader@domain.invalid": {
            "name": "Product Option Reader",
            "password": "testpass",
            "groups": ["Product Option Reader"],
        },
    }

    @pytest.fixture
    def reader_client(self, api_client):
        user = self.users["test_po_reader@domain.invalid"]
        api_client.force_authenticate(user=user)
        return api_client

    @pytest.fixture
    def option_type_size(self):
        return store_models.OptionType.objects.get(code="size")

    @pytest.fixture
    def option_type_colour(self):
        return store_models.OptionType.objects.get(code="colour")

    @pytest.fixture
    def product_option(self, option_type_size, option_type_colour):
        """
        A ProductOption whose option_type FK is changed from 'size' to 'colour',
        producing two history entries.  Both old and new values are live model
        instances so both sides exercise the formatted_name rendering path.
        """
        tangible_type = store_models.TangibleType.objects.get(code="physical")
        distributor = store_models.Distributor.objects.create(
            name="FK Test Distributor",
            description="Used for FK change test.",
        )
        product = store_models.Product.objects.create(
            distributor=distributor,
            name="FK Test Product",
            tangible_type=tangible_type,
            order_between=(1, 10),
        )
        product_option = store_models.ProductOption.objects.create(
            product=product,
            option_type=option_type_size,
            name="Test Option",
            sku="FKTEST-001",
            gtin="0000000000001",
            price="9.99",
        )
        # Change the FK — creates a second history entry.
        product_option.option_type = option_type_colour
        product_option.save()
        return product_option

    def test_history_list_fk_change_uses_formatted_name(
        self, reader_client, product_option, option_type_size, option_type_colour
    ):
        """
        When a FK field changes, diff_against with foreign_keys_are_objs=True
        returns model instances for both old and new values.  The history-list
        endpoint renders these using formatted_name rather than raw PKs.

        This exercises the 'if hasattr(change.new, "_meta")' True branch for
        'new', and the 'hasattr(change.old, "_meta")' True branch for 'old'.
        """
        response = reader_client.get(
            reverse("store.productoption-history-list", kwargs={"pk": product_option.pk}),
        )

        self.assert_response(response, HTTPStatus.OK)
        assert response.data["totalRecords"] == 2  # noqa: PLR2004

        # The most recent entry (FK change) should be first.
        latest_entry = response.data["results"][0]
        assert latest_entry["history_type"] == "~"
        assert latest_entry["num_changes"] >= 1

        changes = latest_entry["changes"]
        option_type_change = next(
            (c for c in changes if c["field"] == "option_type"),
            None,
        )
        assert option_type_change is not None, (
            f"Expected an 'option_type' change; got fields: {[c['field'] for c in changes]}"
        )
        # Both sides are live model instances → rendered as formatted_name strings.
        assert option_type_change["old"] == option_type_size.formatted_name
        assert option_type_change["new"] == option_type_colour.formatted_name
