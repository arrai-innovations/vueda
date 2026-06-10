from http import HTTPStatus
from pprint import pformat

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.confirmation.models import Thing
from vueda.core.exceptions import compute_warnings_digest


LIST_URL = reverse("confirmation.thing-list")


def detail_url(pk):
    return reverse("confirmation.thing-detail", kwargs={"pk": pk})


@pytest.fixture
def client(api_client):
    user = get_user_model().objects.create_superuser(email="confirm@domain.invalid", password="password123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestWarningConfirmationGate:
    def test_create_without_warnings_saves(self, client):
        response = client.post(LIST_URL, data={"name": "fine", "count": 3}, format="json")

        assert response.status_code == HTTPStatus.CREATED, pformat(response.data)
        assert Thing.objects.filter(name="fine", count=3).exists()

    def test_create_with_warning_and_no_acknowledgement_returns_409_without_saving(self, client):
        response = client.post(LIST_URL, data={"name": "risky", "count": -1}, format="json")

        assert response.status_code == HTTPStatus.CONFLICT, pformat(response.data)
        assert response.data["confirmation_required"] is True
        assert response.data["warnings"] == {"count": ["A negative count is unusual."]}
        assert response.data["digest"]
        # The write was withheld.
        assert not Thing.objects.filter(name="risky").exists()

    def test_create_with_correct_acknowledgement_saves(self, client):
        payload = {"name": "risky", "count": -1}
        first = client.post(LIST_URL, data=payload, format="json")
        assert first.status_code == HTTPStatus.CONFLICT, pformat(first.data)
        digest = first.data["digest"]

        confirmed = client.post(LIST_URL, data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=digest)

        assert confirmed.status_code == HTTPStatus.CREATED, pformat(confirmed.data)
        assert Thing.objects.filter(name="risky", count=-1).exists()

    def test_create_with_stale_acknowledgement_re_prompts(self, client):
        response = client.post(
            LIST_URL,
            data={"name": "risky", "count": -1},
            format="json",
            HTTP_ACKNOWLEDGE_WARNINGS="not-the-right-digest",
        )

        assert response.status_code == HTTPStatus.CONFLICT, pformat(response.data)
        assert response.data["digest"]
        assert not Thing.objects.filter(name="risky").exists()

    def test_update_is_gated_then_proceeds_on_acknowledgement(self, client):
        original_count = 5
        new_count = -2
        thing = Thing.objects.create(name="thing", count=original_count)
        payload = {"name": "thing", "count": new_count}

        gated = client.put(detail_url(thing.pk), data=payload, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, pformat(gated.data)
        thing.refresh_from_db()
        assert thing.count == original_count  # unchanged

        confirmed = client.put(
            detail_url(thing.pk), data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"]
        )
        assert confirmed.status_code == HTTPStatus.OK, pformat(confirmed.data)
        thing.refresh_from_db()
        assert thing.count == new_count

    def test_blocking_errors_take_precedence_over_warnings(self, client):
        # name == "blocked" raises in validate(); the warning gate is never reached.
        response = client.post(LIST_URL, data={"name": "blocked", "count": -1}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, pformat(response.data)
        assert "name" in response.data
        assert "confirmation_required" not in response.data
        assert not Thing.objects.filter(name="blocked").exists()


class TestComputeWarningsDigest:
    def test_is_stable_across_calls(self):
        warnings = {"count": ["A negative count is unusual."]}
        assert compute_warnings_digest(warnings) == compute_warnings_digest(warnings)

    def test_is_order_independent(self):
        a = {"count": ["low"], "name": ["odd"]}
        b = {"name": ["odd"], "count": ["low"]}
        assert compute_warnings_digest(a) == compute_warnings_digest(b)

    def test_changes_when_content_changes(self):
        assert compute_warnings_digest({"count": ["low"]}) != compute_warnings_digest({"count": ["very low"]})
