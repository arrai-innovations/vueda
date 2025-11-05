from types import SimpleNamespace

import pytest

from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.vdq.viewsets import DefaultSendQueueViewSet
from vueda.vdq.viewsets import DefaultSentItemViewSet


@pytest.mark.django_db
def test_send_queue_viewset_excludes_done_states(sender, receiver):
    active = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    active.fast_transition("send")

    finished = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    finished.fast_transition("send")
    finished.fast_transition("await")
    finished.fast_transition("succeed")

    viewset = DefaultSendQueueViewSet()
    viewset.request = SimpleNamespace(query_params={}, user=None)
    viewset.kwargs = {}

    queryset = viewset.get_queryset()

    assert queryset.filter(pk=active.pk).exists()
    assert not queryset.filter(pk=finished.pk).exists()

    viewset.kwargs = {"pk": finished.pk}

    queryset_with_pk = viewset.get_queryset()

    assert queryset_with_pk.filter(pk=finished.pk).exists()


@pytest.mark.django_db
def test_sent_item_viewset_resend_single(monkeypatch, sender, receiver):
    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    queue_item.fast_transition("send")
    queue_item.fast_transition("await")
    queue_item.fast_transition("succeed")

    sent_item = SentItem.objects.get(pk=queue_item.pk)

    scheduled = []

    def fake_schedule(queue_item):
        scheduled.append(queue_item)

    monkeypatch.setattr("vueda.vdq.viewsets.schedule_queue_item", fake_schedule)

    viewset = DefaultSentItemViewSet()
    viewset.get_object = lambda: sent_item

    response = viewset.resend(SimpleNamespace(data={}), pk=str(sent_item.pk))

    assert response.status_code == 200  # noqa: PLR2004
    assert response.data == {"message": "Successfully Queued."}
    assert len(scheduled) == 1

    new_queue_item = scheduled[0]
    assert new_queue_item.pk != sent_item.pk
    assert new_queue_item.sender == sent_item.sender
    assert new_queue_item.receiver == sent_item.receiver


@pytest.mark.django_db
def test_sent_item_viewset_resend_bulk(monkeypatch, sender, receiver):
    sent_items = []
    for _ in range(2):
        queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
        queue_item.fast_transition("send")
        queue_item.fast_transition("await")
        queue_item.fast_transition("succeed")
        sent_items.append(SentItem.objects.get(pk=queue_item.pk))

    scheduled = []

    def fake_schedule(queue_item):
        scheduled.append(queue_item)

    monkeypatch.setattr("vueda.vdq.viewsets.schedule_queue_item", fake_schedule)

    viewset = DefaultSentItemViewSet()

    request = SimpleNamespace(data={"pks": [item.pk for item in sent_items]})

    response = viewset.resend(request)

    assert response.status_code == 200  # noqa: PLR2004
    assert len(scheduled) == len(sent_items)
    original_ids = {item.pk for item in sent_items}
    for queue_item in scheduled:
        assert queue_item.pk not in original_ids


@pytest.mark.django_db
def test_send_queue_viewset_returns_full_queryset_without_request(sender, receiver):
    queued = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    finished = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    finished.fast_transition("send")
    finished.fast_transition("await")
    finished.fast_transition("succeed")

    viewset = DefaultSendQueueViewSet()

    queryset = viewset.get_queryset()

    assert queryset.filter(pk=queued.pk).exists()
    assert queryset.filter(pk=finished.pk).exists()
