"""The ``ObjectState`` proxy that carries the workflow state capture trigger."""

__all__ = ("ObjectStateStream",)

from object_streams.triggers import ObjectStreamTrigger

from vueda.workflow.models import ObjectState


class ObjectStateStream(ObjectState):
    """
    Capture writes to ``ObjectState`` as events about the object each row governs.

    A proxy, so the trigger and its migration ship with this app and the ``ObjectState`` table gains the
    trigger only when this app is installed. The subject is the workflow's content type with the row's
    ``object_id``. The ``ObjectState`` row stays the event's source.
    """

    class Meta:
        proxy = True
        # A proxy gets its own content type and permissions. Nothing grants or checks these.
        default_permissions = ()
        triggers = [
            ObjectStreamTrigger(
                name="object_state_stream",
                facet="workflow_state",
                subject_content_type="workflow__content_type",
                subject_pk="object_id",
            )
        ]
