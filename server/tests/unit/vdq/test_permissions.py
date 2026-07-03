from http import HTTPStatus

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.urls import reverse

from tests.conftest import response_body
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem


@pytest.fixture
def sent_item(sender, receiver):
    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    queue_item.fast_transition("send")
    queue_item.fast_transition("await")
    queue_item.fast_transition("succeed")

    return SentItem.objects.get(pk=queue_item.pk)


@pytest.fixture
def can_resend_permission(db):
    return Permission.objects.get(codename="can_resend", content_type__app_label="vueda_vdq")


@pytest.mark.django_db
def test_resend_requires_permission_allows_user(monkeypatch, api_client, sent_item, can_resend_permission):
    user = get_user_model().objects.create_user(email="resender@domain.invalid", password="password123")
    user.user_permissions.add(can_resend_permission)

    scheduled_items = []

    def fake_schedule(queue_item):
        scheduled_items.append(queue_item)

    monkeypatch.setattr("vueda.vdq.viewsets.schedule_queue_item", fake_schedule)

    api_client.force_authenticate(user=user)
    url = reverse("sentitem-resend", kwargs={"pk": sent_item.pk})

    response = api_client.post(url, format="json")

    assert response.status_code == HTTPStatus.OK, response_body(response)
    assert response.data == {"message": "Successfully Queued."}
    assert len(scheduled_items) == 1
    assert scheduled_items[0].pk != sent_item.pk


@pytest.mark.django_db
def test_resend_requires_permission_denies_without_flag(monkeypatch, api_client, sent_item):
    user = get_user_model().objects.create_user(email="no-resend@domain.invalid", password="password123")

    scheduled_items = []

    def fake_schedule(queue_item):
        scheduled_items.append(queue_item)

    monkeypatch.setattr("vueda.vdq.viewsets.schedule_queue_item", fake_schedule)

    api_client.force_authenticate(user=user)
    url = reverse("sentitem-resend", kwargs={"pk": sent_item.pk})

    response = api_client.post(url, format="json")

    assert response.status_code == HTTPStatus.FORBIDDEN, response_body(response)
    assert not scheduled_items
