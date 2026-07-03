from http import HTTPStatus

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.confirmation.models import Gadget
from tests.confirmation.models import Thing
from tests.conftest import response_body
from vueda.core.decorators import DEFAULT_CONFIRM_MESSAGE
from vueda.core.exceptions import compute_warnings_digest


LIST_URL = reverse("confirmation.thing-list")
GADGET_LIST_URL = reverse("confirmation.gadget-list")
BULK_DEACTIVATE_URL = reverse("confirmation.gadget-deactivate")
BULK_ACTIVATE_URL = reverse("confirmation.gadget-activate")


def detail_url(pk):
    return reverse("confirmation.thing-detail", kwargs={"pk": pk})


def thing_action_url(action_name, pk):
    return reverse(f"confirmation.thing-{action_name}", kwargs={"pk": pk})


def gadget_action_url(action_name, pk):
    return reverse(f"confirmation.gadget-{action_name}", kwargs={"pk": pk})


@pytest.fixture
def client(api_client):
    user = get_user_model().objects.create_superuser(email="confirm@domain.invalid", password="password123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestWarningConfirmationGate:
    def test_create_without_warnings_saves(self, client):
        response = client.post(LIST_URL, data={"name": "fine", "count": 3}, format="json")

        assert response.status_code == HTTPStatus.CREATED, response_body(response)
        assert Thing.objects.filter(name="fine", count=3).exists()

    def test_create_with_warning_and_no_acknowledgement_returns_409_without_saving(self, client):
        response = client.post(LIST_URL, data={"name": "risky", "count": -1}, format="json")

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response)
        assert response.data["confirmation_required"] is True
        assert response.data["warnings"] == {"count": ["A negative count is unusual."]}
        assert response.data["digest"]
        # The write was withheld.
        assert not Thing.objects.filter(name="risky").exists()

    def test_create_with_correct_acknowledgement_saves(self, client):
        payload = {"name": "risky", "count": -1}
        first = client.post(LIST_URL, data=payload, format="json")
        assert first.status_code == HTTPStatus.CONFLICT, response_body(first.data)
        digest = first.data["digest"]

        confirmed = client.post(LIST_URL, data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=digest)

        assert confirmed.status_code == HTTPStatus.CREATED, response_body(confirmed.data)
        assert Thing.objects.filter(name="risky", count=-1).exists()

    def test_create_with_stale_acknowledgement_re_prompts(self, client):
        response = client.post(
            LIST_URL,
            data={"name": "risky", "count": -1},
            format="json",
            HTTP_ACKNOWLEDGE_WARNINGS="not-the-right-digest",
        )

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response)
        assert response.data["digest"]
        assert not Thing.objects.filter(name="risky").exists()

    def test_update_is_gated_then_proceeds_on_acknowledgement(self, client):
        original_count = 5
        new_count = -2
        thing = Thing.objects.create(name="thing", count=original_count)
        payload = {"name": "thing", "count": new_count}

        gated = client.put(detail_url(thing.pk), data=payload, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        thing.refresh_from_db()
        assert thing.count == original_count  # unchanged

        confirmed = client.put(
            detail_url(thing.pk), data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"]
        )
        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        thing.refresh_from_db()
        assert thing.count == new_count

    def test_blocking_errors_take_precedence_over_warnings(self, client):
        # name == "blocked" raises in validate(); the warning gate is never reached.
        response = client.post(LIST_URL, data={"name": "blocked", "count": -1}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response_body(response))
        assert "name" in response.data
        assert "confirmation_required" not in response.data
        assert not Thing.objects.filter(name="blocked").exists()


@pytest.mark.django_db
class TestConfirmRequiredAction:
    def test_unacknowledged_submit_returns_409_with_custom_message(self, client):
        original_count = 5
        thing = Thing.objects.create(name="thing", count=original_count)

        response = client.post(thing_action_url("reset-count", thing.pk), format="json")

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response_body(response))
        assert response.data["confirmation_required"] is True
        assert response.data["warnings"] == {"non_field_errors": ["Resetting the count cannot be undone."]}
        assert response.data["digest"]
        thing.refresh_from_db()
        assert thing.count == original_count  # the body never ran

    def test_acknowledged_submit_runs_the_body(self, client):
        thing = Thing.objects.create(name="thing", count=5)
        url = thing_action_url("reset-count", thing.pk)
        gated = client.post(url, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)

        confirmed = client.post(url, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])

        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        thing.refresh_from_db()
        assert thing.count == 0

    def test_stale_acknowledgement_re_prompts(self, client):
        original_count = 5
        thing = Thing.objects.create(name="thing", count=original_count)

        response = client.post(
            thing_action_url("reset-count", thing.pk),
            format="json",
            HTTP_ACKNOWLEDGE_WARNINGS="not-the-right-digest",
        )

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response_body(response))
        assert response.data["digest"]
        thing.refresh_from_db()
        assert thing.count == original_count

    def test_default_confirm_message_when_none_authored(self, client):
        thing = Thing.objects.create(name="thing", count=5)
        url = thing_action_url("clear-name", thing.pk)

        gated = client.post(url, format="json")

        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {"non_field_errors": [DEFAULT_CONFIRM_MESSAGE]}

        confirmed = client.post(url, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])
        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        thing.refresh_from_db()
        assert thing.name == ""

    def test_gate_raises_even_during_dry_run(self, client):
        thing = Thing.objects.create(name="thing", count=5)

        response = client.post(thing_action_url("reset-count", thing.pk), format="json", HTTP_DRY_RUN="true")

        assert response.status_code == HTTPStatus.CONFLICT, response_body(response)


@pytest.mark.django_db
class TestExplicitGateInActionBody:
    def test_invalid_input_returns_400_before_the_gate(self, client):
        original_count = -3
        thing = Thing.objects.create(name="thing", count=original_count)  # would warn, but validation fails first

        response = client.post(thing_action_url("adjust-count", thing.pk), data={"amount": 0}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "amount" in response.data
        assert "confirmation_required" not in response.data
        thing.refresh_from_db()
        assert thing.count == original_count

    def test_valid_input_without_warnings_saves(self, client):
        original_count = 3
        amount = 2
        thing = Thing.objects.create(name="thing", count=original_count)

        response = client.post(thing_action_url("adjust-count", thing.pk), data={"amount": amount}, format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        thing.refresh_from_db()
        assert thing.count == original_count + amount

    def test_valid_input_with_warnings_gates_then_saves_on_acknowledgement(self, client):
        original_count = 3
        amount = -5
        thing = Thing.objects.create(name="thing", count=original_count)
        url = thing_action_url("adjust-count", thing.pk)
        payload = {"amount": amount}

        gated = client.post(url, data=payload, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {"amount": ["This adjustment makes the count negative."]}
        thing.refresh_from_db()
        assert thing.count == original_count  # unchanged

        confirmed = client.post(url, data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])
        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        thing.refresh_from_db()
        assert thing.count == original_count + amount


@pytest.mark.django_db
class TestDestroyWarnings:
    def test_single_destroy_is_gated_then_deletes_on_acknowledgement(self, client):
        thing = Thing.objects.create(name="thing", count=2)
        url = detail_url(thing.pk)

        gated = client.delete(url)
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {"non_field_errors": ["thing still has a positive count."]}
        assert Thing.objects.filter(pk=thing.pk).exists()

        confirmed = client.delete(url, HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])
        assert confirmed.status_code == HTTPStatus.NO_CONTENT, response_body(confirmed.data)
        assert not Thing.objects.filter(pk=thing.pk).exists()

    def test_single_destroy_without_warnings_deletes(self, client):
        thing = Thing.objects.create(name="thing", count=0)

        response = client.delete(detail_url(thing.pk))

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert not Thing.objects.filter(pk=thing.pk).exists()

    def test_bulk_destroy_is_gated_then_deletes_on_acknowledgement(self, client):
        alpha = Thing.objects.create(name="alpha", count=1)
        beta = Thing.objects.create(name="beta", count=4)
        gamma = Thing.objects.create(name="gamma", count=0)
        payload = {"pks": [alpha.pk, beta.pk, gamma.pk]}

        gated = client.delete(LIST_URL, data=payload, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {
            "non_field_errors": ["alpha still has a positive count.", "beta still has a positive count."]
        }
        assert Thing.objects.count() == len(payload["pks"])  # unchanged

        confirmed = client.delete(LIST_URL, data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])
        assert confirmed.status_code == HTTPStatus.NO_CONTENT, response_body(confirmed.data)
        assert Thing.objects.count() == 0

    def test_bulk_destroy_without_warnings_deletes(self, client):
        alpha = Thing.objects.create(name="alpha", count=0)
        beta = Thing.objects.create(name="beta", count=0)

        response = client.delete(LIST_URL, data={"pks": [alpha.pk, beta.pk]}, format="json")

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert Thing.objects.count() == 0

    def test_single_destroy_validation_400_takes_precedence_over_warnings(self, client):
        thing = Thing.objects.create(name="undeletable", count=2)  # would warn, but validation fails first

        response = client.delete(detail_url(thing.pk))

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "confirmation_required" not in response.data
        assert Thing.objects.filter(pk=thing.pk).exists()

    def test_bulk_destroy_missing_pk_400_takes_precedence_over_warnings(self, client):
        thing = Thing.objects.create(name="thing", count=2)  # would warn, but the missing pk fails first
        missing_pk = thing.pk + 1000

        response = client.delete(LIST_URL, data={"pks": [thing.pk, missing_pk]}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "confirmation_required" not in response.data
        assert Thing.objects.filter(pk=thing.pk).exists()


@pytest.mark.django_db
class TestDeactivateActivateWarnings:
    def test_bulk_deactivate_is_gated_then_proceeds_on_acknowledgement(self, client):
        alpha = Gadget.objects.create(name="critical-alpha")
        beta = Gadget.objects.create(name="critical-beta")
        plain = Gadget.objects.create(name="plain")
        payload = {"pks": [alpha.pk, beta.pk, plain.pk]}

        gated = client.patch(BULK_DEACTIVATE_URL, data=payload, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {
            "non_field_errors": ["critical-alpha is critical.", "critical-beta is critical."]
        }
        assert Gadget.objects.filter(is_active=True).count() == len(payload["pks"])  # unchanged

        confirmed = client.patch(
            BULK_DEACTIVATE_URL, data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"]
        )
        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        assert Gadget.objects.filter(is_active=False).count() == len(payload["pks"])

    def test_single_deactivate_is_gated_then_proceeds_on_acknowledgement(self, client):
        gadget = Gadget.objects.create(name="critical-solo")
        url = gadget_action_url("deactivate", gadget.pk)

        gated = client.patch(url, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {"non_field_errors": ["critical-solo is critical."]}
        gadget.refresh_from_db()
        assert gadget.is_active is True

        confirmed = client.patch(url, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"])
        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        gadget.refresh_from_db()
        assert gadget.is_active is False

    def test_deactivate_without_warnings_proceeds(self, client):
        gadget = Gadget.objects.create(name="plain")

        response = client.patch(gadget_action_url("deactivate", gadget.pk), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        gadget.refresh_from_db()
        assert gadget.is_active is False

    def test_bulk_deactivate_validation_400_takes_precedence_over_warnings(self, client):
        active = Gadget.objects.create(name="critical-active")
        inactive = Gadget.objects.create(name="critical-inactive", is_active=False)

        response = client.patch(BULK_DEACTIVATE_URL, data={"pks": [active.pk, inactive.pk]}, format="json")

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert "confirmation_required" not in response.data
        active.refresh_from_db()
        assert active.is_active is True

    def test_bulk_activate_is_gated_then_proceeds_on_acknowledgement(self, client):
        gadget = Gadget.objects.create(name="critical-off", is_active=False)
        payload = {"pks": [gadget.pk]}

        gated = client.patch(BULK_ACTIVATE_URL, data=payload, format="json")
        assert gated.status_code == HTTPStatus.CONFLICT, response_body(gated.data)
        assert gated.data["warnings"] == {"non_field_errors": ["critical-off is critical."]}
        gadget.refresh_from_db()
        assert gadget.is_active is False

        confirmed = client.patch(
            BULK_ACTIVATE_URL, data=payload, format="json", HTTP_ACKNOWLEDGE_WARNINGS=gated.data["digest"]
        )
        assert confirmed.status_code == HTTPStatus.OK, response_body(confirmed.data)
        gadget.refresh_from_db()
        assert gadget.is_active is True

    def test_single_activate_without_warnings_proceeds(self, client):
        gadget = Gadget.objects.create(name="plain", is_active=False)

        response = client.patch(gadget_action_url("activate", gadget.pk), format="json")

        assert response.status_code == HTTPStatus.OK, response_body(response)
        gadget.refresh_from_db()
        assert gadget.is_active is True


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
