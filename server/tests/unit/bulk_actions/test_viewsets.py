import json
import uuid
from http import HTTPStatus
from typing import ClassVar

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from tests.bulk_actions.models import CompositeKeyGadget
from tests.bulk_actions.models import IntegerKeyGadget
from tests.bulk_actions.models import StringKeyGadget
from tests.bulk_actions.models import UUIDKeyGadget
from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.conftest import response_body


def create_integer_gadget(index, **kwargs):
    gadget = IntegerKeyGadget.objects.create(name=f"gadget {index}", **kwargs)
    return gadget, gadget.pk


def create_uuid_gadget(index, **kwargs):
    gadget = UUIDKeyGadget.objects.create(name=f"gadget {index}", **kwargs)
    return gadget, str(gadget.pk)


def create_string_gadget(index, **kwargs):
    gadget = StringKeyGadget.objects.create(code=f"code-{index}", name=f"gadget {index}", **kwargs)
    return gadget, gadget.pk


def create_composite_gadget(index, **kwargs):
    gadget = CompositeKeyGadget.objects.create(batch=1, number=index, name=f"gadget {index}", **kwargs)
    # The JSON array string that the serializer writes for the pk, which a list row holds.
    return gadget, json.dumps([str(value) for value in gadget.pk])


# Each key type: the model, a factory that returns (row, the key a client sends), and a well-formed
# key that names no row.
KEY_TYPES = {
    "integer": (IntegerKeyGadget, create_integer_gadget, 999999),
    "uuid": (UUIDKeyGadget, create_uuid_gadget, str(uuid.UUID(int=0))),
    "string": (StringKeyGadget, create_string_gadget, "missing"),
    "composite": (CompositeKeyGadget, create_composite_gadget, '["999", "999"]'),
}

MALFORMED_KEYS = [
    pytest.param("integer", "abc", "Primary keys must be valid integers.", id="integer-not-a-number"),
    pytest.param(
        "uuid", "not-a-uuid", "Primary keys must be valid values for this model's primary key.", id="uuid-not-a-uuid"
    ),
    pytest.param("string", None, "This field may not be null.", id="string-null"),
    pytest.param(
        "composite", "abc", "Primary keys must be valid values for this model's primary key.", id="composite-not-json"
    ),
    pytest.param(
        "composite", "[1]", "Primary keys must be valid values for this model's primary key.", id="composite-too-short"
    ),
    pytest.param(
        "composite",
        [1, 1],
        "Primary keys must be valid values for this model's primary key.",
        id="composite-not-string",
    ),
]


def list_url(model, action=None):
    return reverse(f"{model._meta.label_lower}-{action or 'list'}")


def detail_url(model, action, pk):
    return reverse(f"{model._meta.label_lower}-{action}", kwargs={"pk": pk})


def send_bulk(client, model, action, pks):
    if action == "destroy":
        return client.delete(list_url(model), data={"pks": pks}, format="json")
    return client.patch(list_url(model, action), data={"pks": pks}, format="json")


def errors(response):
    """The response's error body, without the traceback that the test settings add."""
    return {key: value for key, value in response.json().items() if key != "serverStack"}


def refreshed(model, gadget):
    return model.objects.filter(pk=gadget.pk).first()


@pytest.fixture
def superuser_client(api_client):
    user = get_user_model().objects.create_superuser(email="bulk@domain.invalid", password="password123")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
@pytest.mark.parametrize("key_type", list(KEY_TYPES))
class TestBulkActionsAcceptEveryPrimaryKeyType:
    def test_bulk_deactivate(self, superuser_client, key_type):
        model, create, _missing = KEY_TYPES[key_type]
        first, first_key = create(1)
        second, second_key = create(2)

        response = send_bulk(superuser_client, model, "deactivate", [first_key, second_key])

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data == {"detail": "Successfully deactivated 2 objects."}
        assert not refreshed(model, first).is_active
        assert not refreshed(model, second).is_active

    def test_bulk_activate(self, superuser_client, key_type):
        model, create, _missing = KEY_TYPES[key_type]
        first, first_key = create(1, is_active=False)
        second, second_key = create(2, is_active=False)

        response = send_bulk(superuser_client, model, "activate", [first_key, second_key])

        assert response.status_code == HTTPStatus.OK, response_body(response)
        assert response.data == {"detail": "Successfully activated 2 objects."}
        assert refreshed(model, first).is_active
        assert refreshed(model, second).is_active

    def test_bulk_delete(self, superuser_client, key_type):
        model, create, _missing = KEY_TYPES[key_type]
        first, first_key = create(1)
        second, second_key = create(2)
        kept, _kept_key = create(3)

        response = send_bulk(superuser_client, model, "destroy", [first_key, second_key])

        assert response.status_code == HTTPStatus.NO_CONTENT, response_body(response)
        assert refreshed(model, first) is None
        assert refreshed(model, second) is None
        assert refreshed(model, kept) is not None

    @pytest.mark.parametrize("action", ["deactivate", "activate", "destroy"])
    def test_missing_key_answers_does_not_exist_and_changes_nothing(self, superuser_client, key_type, action):
        model, create, missing_key = KEY_TYPES[key_type]
        gadget, gadget_key = create(1, is_active=action != "activate")

        response = send_bulk(superuser_client, model, action, [gadget_key, missing_key])

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert errors(response) == {str(missing_key): [f"Object with pk={missing_key} does not exist."]}
        unchanged = refreshed(model, gadget)
        assert unchanged is not None
        assert unchanged.is_active == (action != "activate")

    def test_already_deactivated_error_names_the_sent_key(self, superuser_client, key_type):
        model, create, _missing = KEY_TYPES[key_type]
        _gadget, gadget_key = create(1, is_active=False)

        response = send_bulk(superuser_client, model, "deactivate", [gadget_key])

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert errors(response) == {str(gadget_key): [f"This {model.__name__} is already deactivated"]}


@pytest.mark.django_db
@pytest.mark.parametrize(("key_type", "malformed_key", "message"), MALFORMED_KEYS)
@pytest.mark.parametrize("action", ["deactivate", "activate", "destroy"])
def test_malformed_key_answers_400_naming_the_entry(superuser_client, key_type, malformed_key, message, action):
    model, create, _missing = KEY_TYPES[key_type]
    gadget, gadget_key = create(1, is_active=action != "activate")

    response = send_bulk(superuser_client, model, action, [gadget_key, malformed_key])

    assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
    assert errors(response)["pks"] == {"1": [message]}
    assert refreshed(model, gadget).is_active == (action != "activate")


@pytest.mark.django_db
def test_keys_compare_after_conversion(superuser_client):
    gadget, gadget_key = create_uuid_gadget(1)

    response = send_bulk(superuser_client, UUIDKeyGadget, "deactivate", [gadget_key.upper()])

    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert not refreshed(UUIDKeyGadget, gadget).is_active


@pytest.mark.django_db
def test_integer_key_sent_as_a_string_matches(superuser_client):
    gadget, gadget_key = create_integer_gadget(1)

    response = send_bulk(superuser_client, IntegerKeyGadget, "deactivate", [str(gadget_key)])

    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert not refreshed(IntegerKeyGadget, gadget).is_active


class RowLevelTestData(BaseTestUserMixin, BaseTestGroupMixin):
    groups_to_create: ClassVar[dict] = {
        "Gadget Manager": [
            ("bulk_actions", "IntegerKeyGadget", "read"),
            ("bulk_actions", "IntegerKeyGadget", "update"),
            ("bulk_actions", "IntegerKeyGadget", "delete"),
        ]
    }

    users_to_create: ClassVar[dict] = {
        "manager@domain.invalid": {"name": "Manager", "password": "testpass", "groups": ["Gadget Manager"]},
    }


@pytest.mark.django_db
class TestBulkActionsApplyRowLevelPermissions:
    @pytest.fixture
    def manager_client(self, api_client):
        api_client.force_authenticate(user=RowLevelTestData().users["manager@domain.invalid"])
        return api_client

    @pytest.mark.parametrize(
        ("action", "method"), [("deactivate", "patch"), ("activate", "patch"), ("destroy", "delete")]
    )
    def test_a_refused_row_answers_as_missing_and_nothing_changes(self, manager_client, action, method):
        is_active = action != "activate"
        allowed, allowed_key = create_integer_gadget(1, is_active=is_active)
        locked, locked_key = create_integer_gadget(2, is_active=is_active, locked=True)

        single_url = detail_url(IntegerKeyGadget, "detail" if action == "destroy" else action, locked_key)
        single = getattr(manager_client, method)(single_url, format="json")
        assert single.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.NOT_FOUND), response_body(single)

        response = send_bulk(manager_client, IntegerKeyGadget, action, [allowed_key, locked_key])

        assert response.status_code == HTTPStatus.BAD_REQUEST, response_body(response)
        assert errors(response) == {str(locked_key): [f"Object with pk={locked_key} does not exist."]}
        assert refreshed(IntegerKeyGadget, allowed).is_active == is_active
        assert refreshed(IntegerKeyGadget, locked).is_active == is_active

    @pytest.mark.parametrize("action", ["deactivate", "activate", "destroy"])
    def test_permitted_rows_proceed(self, manager_client, action):
        is_active = action != "activate"
        first, first_key = create_integer_gadget(1, is_active=is_active)
        second, second_key = create_integer_gadget(2, is_active=is_active)

        response = send_bulk(manager_client, IntegerKeyGadget, action, [first_key, second_key])

        assert response.status_code in (HTTPStatus.OK, HTTPStatus.NO_CONTENT), response_body(response)
        if action == "destroy":
            assert refreshed(IntegerKeyGadget, first) is None
            assert refreshed(IntegerKeyGadget, second) is None
        else:
            assert refreshed(IntegerKeyGadget, first).is_active == (not is_active)
            assert refreshed(IntegerKeyGadget, second).is_active == (not is_active)
