import pytest

from vueda.vdq.models import AnyMailQueueItem
from vueda.vdq.models import QueueItem
from vueda.vdq.models import Receiver
from vueda.vdq.models import Sender
from vueda.vdq.models import SMSQueueItem


@pytest.fixture
def sender(db):
    return Sender.objects.create(
        email="primary-sender@domain.invalid",
        name="Sender",
        cell="+18005550101",
    )


@pytest.fixture
def receiver(db):
    return Receiver.objects.create(
        email="primary-receiver@domain.invalid",
        name="Receiver",
        cell="+18005550102",
    )


@pytest.fixture
def other_receiver(db):
    return Receiver.objects.create(
        email="other-receiver@domain.invalid",
        name="Other Receiver",
        cell="+18005550103",
    )


@pytest.fixture
def email_sender(db):
    return Sender.objects.create(
        email="email-sender@domain.invalid",
        name="Email Sender",
        cell="+18005550104",
    )


@pytest.fixture
def email_receiver(db):
    return Receiver.objects.create(
        email="email-receiver@domain.invalid",
        name="Email Receiver",
        cell="+18005550105",
    )


@pytest.fixture
def sms_sender(db):
    return Sender.objects.create(
        email="sms-sender@domain.invalid",
        name="SMS Sender",
        cell="+18005550106",
    )


@pytest.fixture
def sms_receiver(db):
    return Receiver.objects.create(
        email="sms-receiver@domain.invalid",
        name="SMS Receiver",
        cell="+18005550107",
    )


@pytest.fixture
def email_queue_item(sender, receiver):
    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="email")
    AnyMailQueueItem.objects.create(queue_item=queue_item, subject="Subject", text="Body", html="")
    return queue_item


@pytest.fixture
def sms_queue_item(sender, receiver):
    queue_item = QueueItem.objects.create(sender=sender, receiver=receiver, method="sms")
    SMSQueueItem.objects.create(queue_item=queue_item, body="hello", media_url=[], message_sid="SID")
    return queue_item


@pytest.fixture
def queue_item_email(email_sender, email_receiver):
    queue_item = QueueItem.objects.create(sender=email_sender, receiver=email_receiver, method="email")
    queue_item.fast_transition("send")
    return queue_item


@pytest.fixture
def queue_item_sms(sms_sender, sms_receiver):
    queue_item = QueueItem.objects.create(sender=sms_sender, receiver=sms_receiver, method="sms")
    SMSQueueItem.objects.create(queue_item=queue_item, body="hello", media_url=None, message_sid="")
    queue_item.fast_transition("send")
    return queue_item
