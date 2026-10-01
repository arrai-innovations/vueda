from types import SimpleNamespace

import pytest

from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.tracking import EmailTrackingStrategy
from vueda.vdq.tracking import MetadataEmailTrackingStrategy
from vueda.vdq.tracking import get_email_tracking_strategy


def test_the_metadata_strategy_is_the_default(settings):
    assert isinstance(get_email_tracking_strategy(), MetadataEmailTrackingStrategy)


def test_the_setting_accepts_a_dotted_path(settings):
    settings.VDQ_EMAIL_TRACKING_STRATEGY = "vueda.vdq.tracking.EmailTrackingStrategy"
    assert type(get_email_tracking_strategy()) is EmailTrackingStrategy


def test_the_setting_accepts_a_class(settings):
    settings.VDQ_EMAIL_TRACKING_STRATEGY = EmailTrackingStrategy
    assert type(get_email_tracking_strategy()) is EmailTrackingStrategy


class CustomEmailTrackingStrategy(EmailTrackingStrategy):
    """An integrator's subclass, for the override tests."""


@pytest.mark.parametrize(
    "value",
    [CustomEmailTrackingStrategy, f"{__name__}.CustomEmailTrackingStrategy"],
    ids=["class", "dotted path"],
)
def test_the_setting_overrides_the_default_with_a_custom_subclass(settings, value):
    settings.VDQ_EMAIL_TRACKING_STRATEGY = value
    assert type(get_email_tracking_strategy()) is CustomEmailTrackingStrategy


def test_the_no_op_strategy_attaches_nothing_and_finds_nothing():
    email = SimpleNamespace()
    strategy = EmailTrackingStrategy()

    strategy.attach(email, SimpleNamespace(pk=1))

    assert not hasattr(email, "metadata")
    assert strategy.find_queue_item(SimpleNamespace(metadata={"vdq_queue_item": "1"})) is None


def test_the_metadata_strategy_keeps_other_metadata():
    email = SimpleNamespace(metadata={"campaign": "spring"})

    MetadataEmailTrackingStrategy().attach(email, SimpleNamespace(pk=12))

    assert email.metadata == {"campaign": "spring", "vdq_queue_item": "12"}


@pytest.mark.django_db
def test_the_metadata_strategy_finds_the_item_from_a_string_or_integer_key(queue_item_email):
    AnyMailQueueItem.objects.create(queue_item=queue_item_email, subject="Subject", text="Plain text")
    strategy = MetadataEmailTrackingStrategy()

    assert strategy.find_queue_item(SimpleNamespace(metadata={"vdq_queue_item": str(queue_item_email.pk)})) == (
        queue_item_email
    )
    assert strategy.find_queue_item(SimpleNamespace(metadata={"vdq_queue_item": queue_item_email.pk})) == (
        queue_item_email
    )


@pytest.mark.django_db
@pytest.mark.parametrize("metadata", [None, {}, {"vdq_queue_item": "not-a-key"}, {"other": "1"}])
def test_the_metadata_strategy_finds_nothing_without_a_usable_key(metadata):
    assert MetadataEmailTrackingStrategy().find_queue_item(SimpleNamespace(metadata=metadata)) is None


@pytest.mark.django_db
def test_the_metadata_strategy_finds_only_email_items(sms_queue_item):
    event = SimpleNamespace(metadata={"vdq_queue_item": str(sms_queue_item.pk)})
    assert MetadataEmailTrackingStrategy().find_queue_item(event) is None
