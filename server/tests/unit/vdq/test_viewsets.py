from http import HTTPStatus
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.urls import reverse
from rest_framework import status

from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem


@pytest.mark.django_db(transaction=True)
class TestQueueItemWorkflowTransitions:
    @pytest.fixture(autouse=True)
    def setup_user(self):
        self.user = get_user_model().objects.create_superuser(
            email="queue-checker@domain.invalid", password="password123"
        )

    @pytest.fixture
    def authenticated_client(self, api_client):
        api_client.force_authenticate(user=self.user)
        return api_client

    @pytest.fixture
    def delayed_queue_item(self, queue_item_email):
        queue_item_email.fast_transition("delay")
        return queue_item_email

    def test_cancel_queueitem_with_dry_run(self, authenticated_client, delayed_queue_item):
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={
                "app_label": delayed_queue_item._meta.app_label,
                "model": delayed_queue_item._meta.model_name,
                "object_id": delayed_queue_item.pk,
            },
        )
        with patch("vueda.vdq.celery.app.control.revoke") as mock_revoke:
            response = authenticated_client.patch(
                detail_url,
                {"transition_code": "cancel"},
                format="json",
                HTTP_DRY_RUN="true",
            )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["new_state"]["code"] == "cancelled"
        delayed_queue_item.refresh_from_db()
        assert delayed_queue_item.workflow_state.code == "delayed"
        mock_revoke.assert_not_called()

    def test_cancel_queueitem(self, authenticated_client, delayed_queue_item):
        delayed_queue_item.task_id = "test-task-id-123"
        delayed_queue_item.save()
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={
                "app_label": delayed_queue_item._meta.app_label,
                "model": delayed_queue_item._meta.model_name,
                "object_id": delayed_queue_item.pk,
            },
        )
        with patch("vueda.vdq.celery.app.control.revoke") as mock_revoke:
            response = authenticated_client.patch(
                detail_url,
                {"transition_code": "cancel"},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["new_state"]["code"] == "cancelled"
        delayed_queue_item.refresh_from_db()
        assert delayed_queue_item.workflow_state.code == "cancelled"
        mock_revoke.assert_called_once_with("test-task-id-123", terminate=False)

    def test_retry_queueitem_with_dry_run(self, authenticated_client, delayed_queue_item):
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={
                "app_label": delayed_queue_item._meta.app_label,
                "model": delayed_queue_item._meta.model_name,
                "object_id": delayed_queue_item.pk,
            },
        )
        with patch("vueda.vdq.tasks.send_message.delay") as send_message:
            response = authenticated_client.patch(
                detail_url,
                {"transition_code": "retry"},
                format="json",
                HTTP_DRY_RUN="true",
            )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["new_state"]["code"] == "queued"
        delayed_queue_item.refresh_from_db()
        assert delayed_queue_item.workflow_state.code == "delayed"
        send_message.assert_not_called()

    def test_retry_queueitem(self, authenticated_client, delayed_queue_item):
        detail_url = reverse(
            "workflow.workflow-execute-transition",
            kwargs={
                "app_label": delayed_queue_item._meta.app_label,
                "model": delayed_queue_item._meta.model_name,
                "object_id": delayed_queue_item.pk,
            },
        )
        with patch("vueda.vdq.schedulers.send_message.delay") as send_message:
            response = authenticated_client.patch(
                detail_url,
                {"transition_code": "retry"},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["new_state"]["code"] == "queued"
        delayed_queue_item.refresh_from_db()
        assert delayed_queue_item.workflow_state.code == "queued"
        send_message.assert_called_once()


@pytest.mark.django_db
def test_send_queue_viewset_excludes_done_states(api_client, sender, receiver):
    active = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    active.fast_transition("send")

    finished = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    finished.fast_transition("send")
    finished.fast_transition("await")
    finished.fast_transition("succeed")

    user = get_user_model().objects.create_superuser(email="queue-checker@domain.invalid", password="password123")
    api_client.force_authenticate(user=user)

    list_url = reverse("vueda_vdq.queueitem-list")
    response = api_client.get(list_url, format="json")

    assert response.status_code == HTTPStatus.OK, response.data
    result_ids = {item["id"] for item in response.data["results"]}
    assert active.pk in result_ids
    assert finished.pk not in result_ids

    detail_url = reverse("vueda_vdq.queueitem-detail", kwargs={"pk": finished.pk})
    detail_response = api_client.get(detail_url, format="json")

    assert detail_response.status_code == HTTPStatus.OK, detail_response.data
    assert detail_response.data["id"] == finished.pk


@pytest.mark.django_db
def test_sent_item_viewset_resend_single(monkeypatch, api_client, sender, receiver):
    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    queue_item.fast_transition("send")
    queue_item.fast_transition("await")
    queue_item.fast_transition("succeed")

    sent_item = SentItem.objects.get(pk=queue_item.pk)

    user = get_user_model().objects.create_user(email="resender@domain.invalid", password="password123")
    permission = Permission.objects.get(codename="can_resend", content_type__app_label="vueda_vdq")
    user.user_permissions.add(permission)
    api_client.force_authenticate(user=user)

    scheduled = []

    def fake_schedule(queue_item):
        scheduled.append(queue_item)

    monkeypatch.setattr("vueda.vdq.viewsets.schedule_queue_item", fake_schedule)

    url = reverse("sentitem-resend", kwargs={"pk": sent_item.pk})
    response = api_client.post(url, format="json")

    assert response.status_code == HTTPStatus.OK, response.data
    assert response.data == {"message": "Successfully Queued."}
    assert len(scheduled) == 1

    new_queue_item = scheduled[0]
    assert new_queue_item.pk != sent_item.pk
    assert new_queue_item.sender == sent_item.sender
    assert new_queue_item.receiver == sent_item.receiver


@pytest.mark.django_db
def test_sent_item_viewset_resend_bulk(monkeypatch, api_client, sender, receiver):
    sent_items = []
    for _ in range(2):
        queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
        queue_item.fast_transition("send")
        queue_item.fast_transition("await")
        queue_item.fast_transition("succeed")
        sent_items.append(SentItem.objects.get(pk=queue_item.pk))

    user = get_user_model().objects.create_user(email="bulk-resender@domain.invalid", password="password123")
    permission = Permission.objects.get(codename="can_resend", content_type__app_label="vueda_vdq")
    user.user_permissions.add(permission)
    api_client.force_authenticate(user=user)

    scheduled = []

    def fake_schedule(queue_item):
        scheduled.append(queue_item)

    monkeypatch.setattr("vueda.vdq.viewsets.schedule_queue_item", fake_schedule)

    url = reverse("sentitem-resend")
    response = api_client.post(url, {"pks": [item.pk for item in sent_items]}, format="json")

    assert response.status_code == HTTPStatus.OK, response.data
    assert len(scheduled) == len(sent_items)
    original_ids = {item.pk for item in sent_items}
    for queue_item in scheduled:
        assert queue_item.pk not in original_ids


@pytest.mark.django_db
def test_send_queue_viewset_returns_items_by_pk(api_client, sender, receiver):
    queued = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    finished = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    finished.fast_transition("send")
    finished.fast_transition("await")
    finished.fast_transition("succeed")

    user = get_user_model().objects.create_superuser(email="queue-reader@domain.invalid", password="password123")
    api_client.force_authenticate(user=user)

    queued_response = api_client.get(reverse("vueda_vdq.queueitem-detail", kwargs={"pk": queued.pk}), format="json")
    finished_response = api_client.get(
        reverse("vueda_vdq.queueitem-detail", kwargs={"pk": finished.pk}),
        format="json",
    )

    assert queued_response.status_code == HTTPStatus.OK, queued_response.data
    assert queued_response.data["id"] == queued.pk
    assert finished_response.status_code == HTTPStatus.OK, finished_response.data
    assert finished_response.data["id"] == finished.pk
