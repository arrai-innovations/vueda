"""Constants for the VUEDA Dispatch Queue."""

__all__ = (
    "QUEUE_ITEM_DONE_STATES",
    "TWILIO_QUEUE_ITEM_PARAM",
)

QUEUE_ITEM_DONE_STATES = ["cancelled", "succeeded", "unconfirmed"]

# Query parameter on the Twilio status callback URL that carries the queue item's primary key.
TWILIO_QUEUE_ITEM_PARAM = "queue_item"
