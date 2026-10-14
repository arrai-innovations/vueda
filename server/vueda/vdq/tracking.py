"""Strategies that carry a queue item's key on an outgoing email and read it back from a tracking event."""

__all__ = (
    "EmailTrackingStrategy",
    "MetadataEmailTrackingStrategy",
    "get_email_tracking_strategy",
)

from django.conf import settings
from django.utils.module_loading import import_string

from vueda.vdq.models import QueueItem


class EmailTrackingStrategy:
    """
    Attach nothing to an email and find no queue item from a tracking event.

    ``send_email`` matches a tracking event to its queue item by the message ID the ESP returned. A strategy
    gives it a second way to match, for an event that arrives before VDQ stored that ID. This base class is the
    no-op strategy. Set ``VDQ_EMAIL_TRACKING_STRATEGY`` to it on an ESP that accepts no tracking data, or
    subclass it to carry the key another way, such as in a tag.
    """

    def attach(self, email, queue_item) -> None:
        """Add tracking data that identifies ``queue_item`` to ``email`` before it is sent."""

    def find_queue_item(self, event) -> QueueItem | None:
        """Return the queue item that the tracking data on ``event`` identifies, or ``None``."""
        return None


class MetadataEmailTrackingStrategy(EmailTrackingStrategy):
    """
    Carry the queue item's primary key in the email's Anymail ``metadata``.

    This is the default strategy. Anymail sends ``metadata`` to the ESP and returns it on tracking events for
    the ESPs that support it.
    """

    metadata_key = "vdq_queue_item"

    def attach(self, email, queue_item) -> None:
        metadata = dict(getattr(email, "metadata", None) or {})
        metadata[self.metadata_key] = str(queue_item.pk)
        email.metadata = metadata

    def find_queue_item(self, event) -> QueueItem | None:
        metadata = getattr(event, "metadata", None) or {}
        try:
            pk = int(metadata[self.metadata_key])
        except (KeyError, TypeError, ValueError):
            return None
        return QueueItem.objects.filter(pk=pk, method="email").first()


def get_email_tracking_strategy() -> EmailTrackingStrategy:
    """
    Instantiate the strategy that ``VDQ_EMAIL_TRACKING_STRATEGY`` names.

    The setting holds the strategy class or its dotted import path. A dotted path lets a settings module name
    a strategy without importing VDQ models before Django's app registry is ready. Without the setting,
    ``MetadataEmailTrackingStrategy`` is used.
    """
    strategy = getattr(settings, "VDQ_EMAIL_TRACKING_STRATEGY", MetadataEmailTrackingStrategy)
    if isinstance(strategy, str):
        strategy = import_string(strategy)
    return strategy()
