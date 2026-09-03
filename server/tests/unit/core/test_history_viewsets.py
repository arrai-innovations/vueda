"""Viewset tests for the pre-v3 'current' revision-token action on store models.

The action reports whether a revision identifier a client holds is still the newest one for an
object. It is replaced by ``object_revision`` on the ordinary serializer.
"""

from http import HTTPStatus
from typing import ClassVar

import pytest
from django.urls import reverse

from tests.conftest import BaseTestAssertResponseMixin
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body
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
        assert response.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED), response_body(response)


# ---------------------------------------------------------------------------
# 'history-list' action — Distributor (scalar fields only)
# ---------------------------------------------------------------------------
