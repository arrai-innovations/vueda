"""
Inline saves, sent through a viewset route in the shape that the client sends them.

Each scenario in ``tests/fixtures/inline-save.json`` names an inline action, the rows saved before it, the request that
the client sends for it, and the rows that the save leaves. The client spec
``client/tests/unit/lib/form/field-set/inlineSaveRequest.integration.spec.js`` proves that the real form and inlines
send each request. These tests send the same request, with the same ``e`` and ``f`` parameters, through the
``tests.inline`` route for its relation. A change on either side that breaks the other fails one of the two suites.

The request goes through a route, not a serializer call, because ``e`` is what swaps a relation for its nested
serializer (``FlexFieldsWriteableNestedSerializerMixin._expand_fields_for_write``).
"""

import json
from pathlib import Path
from urllib.parse import urlencode

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from tests.conftest import response_body
from tests.inline import models
from tests.inline import serializers
from tests.inline import viewsets
from vueda.info import registration


FIXTURE = json.loads((Path(__file__).parents[2] / "fixtures" / "inline-save.json").read_text())
PARENT_PK = FIXTURE["parent_pk"]

RELATED_MODELS = {
    "lines": models.InlineLine,
    "tags": models.InlineTag,
    "note": models.InlineNote,
    "contact": models.InlineContact,
    "address": models.InlineAddress,
}

# A nested write checks the related model's canonical viewset before it saves a shared row (forward and
# many-to-many relations), so those models need a registration.
SHARED_ROW_REGISTRATIONS = (
    (serializers.InlineContactSerializer, viewsets.InlineContactViewSet),
    (serializers.InlineAddressSerializer, viewsets.InlineAddressViewSet),
    (serializers.InlineTagSerializer, viewsets.InlineTagViewSet),
)


@pytest.fixture
def superuser_client(api_client, monkeypatch):
    for serializer, viewset in SHARED_ROW_REGISTRATIONS:
        monkeypatch.setitem(
            registration._registry,
            serializer.Meta.model._meta.label_lower,
            {"serializer": serializer, "viewset": viewset},
        )
    user = get_user_model().objects.create_superuser(
        email="inline_admin@domain.invalid", name="Inline Admin", password="testpass"
    )
    api_client.force_authenticate(user=user)
    return api_client


def save_parent_and_related(relation, saved):
    """Create the parent and the related rows that ``saved`` describes, with the primary keys that it gives."""
    parent = models.InlineParent.objects.create(id=PARENT_PK, name=saved["name"])
    value = saved[relation]
    if relation == "lines":
        for row in value:
            models.InlineLine.objects.create(parent=parent, **row)
    elif relation == "tags":
        parent.tags.add(*(models.InlineTag.objects.create(**row) for row in value))
    elif relation == "note":
        models.InlineNote.objects.create(parent=parent, **value)
    else:
        setattr(parent, relation, RELATED_MODELS[relation].objects.create(**value))
        parent.save()
    return parent


def linked_names(parent, relation):
    """Return the sorted names of the rows that the parent's relation holds."""
    if relation in {"lines", "tags"}:
        return sorted(getattr(parent, relation).values_list("name", flat=True))
    related = RELATED_MODELS[relation].objects.filter(
        **({"parent": parent} if relation == "note" else {"inlineparent": parent})
    )
    return sorted(related.values_list("name", flat=True))


def query_string(request):
    """Encode ``e`` and ``f`` the way the client's CRUD adapter does: comma-joined, and left out when empty."""
    params = {key: ",".join(request[key]) for key in ("e", "f") if request[key]}
    return f"?{urlencode(params)}" if params else ""


@pytest.mark.django_db
@pytest.mark.parametrize("scenario", FIXTURE["scenarios"], ids=lambda scenario: scenario["name"])
def test_inline_save_request(superuser_client, scenario):
    relation, request = scenario["relation"], scenario["request"]
    if scenario["view"] == "update":
        save_parent_and_related(relation, scenario["saved"])
        url = reverse(f"inline.parent-{relation}-detail", kwargs={"pk": PARENT_PK}) + query_string(request)
        response = superuser_client.put(url, data=request["body"], format="json")
        expected_status = status.HTTP_200_OK
    else:
        url = reverse(f"inline.parent-{relation}-list") + query_string(request)
        response = superuser_client.post(url, data=request["body"], format="json")
        expected_status = status.HTTP_201_CREATED

    assert response.status_code == expected_status, response_body(response)
    parent = models.InlineParent.objects.get(pk=response.data["id"])
    assert {
        "name": parent.name,
        "linked": linked_names(parent, relation),
        "rows": sorted(RELATED_MODELS[relation].objects.values_list("name", flat=True)),
    } == scenario["result"]


@pytest.mark.django_db
def test_a_new_reverse_one_to_one_object_replaces_the_saved_child(superuser_client):
    """
    A reverse one-to-one body without a primary key replaces the parent's saved child: the update deletes the saved
    child and creates a new one.

    drf-writable-nested would copy the saved child's primary key into the body and update that child
    (``update_or_create_reverse_relations``). VUEDA's ``update`` deletes the rows that the body leaves out first
    (``delete_reverse_relations_if_need``), and a body without a primary key keeps none, so the saved child is gone
    before the copy could find it. A singular inline's Create button shows only while the relation is empty. A model
    config whose ``submitFields`` narrows the relation to dotted entries without its primary key, such as
    ``note.name``, still sends this body on every save. So can another client, so the test records what it does.
    """
    saved_note_pk = 9101
    save_parent_and_related("note", {"name": "Parent", "note": {"id": saved_note_pk, "name": "Saved"}})
    url = reverse("inline.parent-note-detail", kwargs={"pk": PARENT_PK}) + "?e=note"

    response = superuser_client.put(url, data={"name": "Parent", "note": {"name": "Replacement"}}, format="json")

    assert response.status_code == status.HTTP_200_OK, response_body(response)
    [(note_pk, note_name)] = models.InlineNote.objects.filter(parent_id=PARENT_PK).values_list("id", "name")
    assert note_name == "Replacement"
    assert note_pk != saved_note_pk
    assert not models.InlineNote.objects.filter(pk=saved_note_pk).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("relation", "child_model", "parent_pk_after"),
    [
        ("memo", models.InlineMemo, None),
        ("badge", models.InlineBadge, models.SPARE_PARENT_PK),
    ],
    ids=["set-null", "set-default"],
)
def test_null_keeps_a_reverse_one_to_one_child_whose_field_sets_null_or_default(
    superuser_client, relation, child_model, parent_pk_after
):
    """
    ``null`` through the expand removes the parent's reverse one-to-one child. ``InlineMemo`` uses ``SET_NULL``, so
    its ``parent`` becomes null. ``InlineBadge`` uses ``SET_DEFAULT``, so its ``parent`` becomes the spare parent. In
    both cases the child stays, and the parent no longer has it.
    """
    parent = models.InlineParent.objects.create(id=PARENT_PK, name="Parent")
    models.InlineParent.objects.create(id=models.SPARE_PARENT_PK, name="Spare")
    child_model.objects.create(id=9101, parent=parent, name="Saved")
    url = reverse(f"inline.parent-{relation}-detail", kwargs={"pk": PARENT_PK}) + f"?e={relation}"

    response = superuser_client.put(url, data={"name": "Parent", relation: None}, format="json")

    assert response.status_code == status.HTTP_200_OK, response_body(response)
    assert response.data[relation] is None
    assert child_model.objects.get(pk=9101).parent_id == parent_pk_after


@pytest.mark.django_db
@pytest.mark.parametrize("expand", ["contact", "contact_detail"])
def test_an_expand_keeps_a_declared_field_that_rejects_null(superuser_client, expand):
    """
    The serializer declares ``contact_ref`` for ``contact`` with ``allow_null=False``, although the model field allows
    null. Naming an expand of ``contact`` in ``e`` keeps that rule, so ``null`` cannot clear the link through the
    expand. The declared field's name differs from its ``source``, so the rule finds it through ``source``.
    ``contact`` reaches the field by its own name, and ``contact_detail`` reaches it through its own ``source``.
    """
    save_parent_and_related("contact", {"name": "Parent", "contact": {"id": 9101, "name": "Saved"}})
    url = reverse("inline.parent-declared-contact-detail", kwargs={"pk": PARENT_PK}) + f"?e={expand}"

    response = superuser_client.put(url, data={"name": "Parent", expand: None}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data[expand] == ["This field may not be null."]
    assert models.InlineParent.objects.get(pk=PARENT_PK).contact.name == "Saved"


@pytest.mark.django_db
def test_an_expand_keeps_an_extra_kwargs_rule_that_rejects_null(superuser_client):
    """
    ``Meta.extra_kwargs`` gives ``contact`` ``allow_null=False``, although the model field allows null. Naming it in
    ``e`` keeps that rule, so ``null`` cannot clear the link through the expand.
    """
    save_parent_and_related("contact", {"name": "Parent", "contact": {"id": 9101, "name": "Saved"}})
    url = reverse("inline.parent-not-null-contact-detail", kwargs={"pk": PARENT_PK}) + "?e=contact"

    response = superuser_client.put(url, data={"name": "Parent", "contact": None}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["contact"] == ["This field may not be null."]
    assert models.InlineParent.objects.get(pk=PARENT_PK).contact.name == "Saved"


@pytest.mark.django_db
def test_a_second_expand_of_the_same_field_keeps_the_extra_kwargs_rule(superuser_client):
    """
    ``e=contact,contact_detail`` swaps ``contact`` for its nested serializer before ``contact_detail`` is built. The
    ``contact_detail`` expand still reads the plain ``contact`` field's ``allow_null=False``, so ``null`` through it
    cannot clear the link.
    """
    save_parent_and_related("contact", {"name": "Parent", "contact": {"id": 9101, "name": "Saved"}})
    url = reverse("inline.parent-not-null-contact-detail", kwargs={"pk": PARENT_PK}) + "?e=contact,contact_detail"

    response = superuser_client.put(
        url,
        data={"name": "Parent", "contact": {"id": 9101, "name": "Saved"}, "contact_detail": None},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["contact_detail"] == ["This field may not be null."]
    assert models.InlineParent.objects.get(pk=PARENT_PK).contact.name == "Saved"


@pytest.mark.django_db
def test_null_for_a_restricted_reverse_one_to_one_child_returns_400(superuser_client):
    """
    Another row holds the saved note with ``on_delete=RESTRICT``, so the note cannot be deleted. ``null`` through the
    expand returns a ``400``, as a ``PROTECT`` hold does, and the note stays. The message names the holding row,
    as drf-writable-nested's message for a ``PROTECT`` hold does.
    """
    parent = save_parent_and_related("note", {"name": "Parent", "note": {"id": 9101, "name": "Saved"}})
    models.InlineNoteHold.objects.create(note=parent.note, name="Hold")
    url = reverse("inline.parent-note-detail", kwargs={"pk": PARENT_PK}) + "?e=note"

    response = superuser_client.put(url, data={"name": "Parent", "note": None}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST, response_body(response)
    assert response.data["non_field_errors"] == ["Cannot delete Hold because protected relation exists"], response_body(
        response
    )
    assert models.InlineNote.objects.filter(pk=9101).exists()
