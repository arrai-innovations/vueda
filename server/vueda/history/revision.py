"""The per-object revision token.

``object_revision`` answers one question: is the copy of this object I hold still the current one.
It is the object's newest event identifier, and it shares the form of the identifiers the history
response publishes, so a client compares the token it holds against an event's own identifier
directly rather than learning a second concept.

Nothing enforces the token on write. It exists so a later conflict-detection feature has a
primitive to build on.
"""

__all__ = (
    "REVISION_ANNOTATION",
    "ObjectRevisionField",
    "annotate_object_revision",
    "is_tracked",
    "object_revision",
)

from django.db.models import OuterRef
from django.db.models import Subquery
from rest_framework import serializers

from vueda.core.open_api import conditional_extend_schema_field_decorator


#: The annotation the queryset carries and the field reads.
REVISION_ANNOTATION = "_object_revision"


def is_tracked(model) -> bool:
    """Whether history recorded an event model for this model.

    pghistory sets ``pgh_event_model`` on a model it tracks, so this answers the model's history
    policy as it actually resolved rather than as it was declared. A proxy inherits the concrete
    model's event model, which is where its writes are recorded.
    """
    return getattr(model, "pgh_event_model", None) is not None


def annotate_object_revision(queryset):
    """Annotate the newest event id for each row. A no-op for a model without history.

    Applied where the token is serialized rather than on every queryset, following
    ``annotate_formatted_name``. The subquery matches on the event table's indexed object column.
    """
    event_model = getattr(queryset.model, "pgh_event_model", None)
    if event_model is None:
        return queryset
    return queryset.annotate(
        **{
            REVISION_ANNOTATION: Subquery(
                event_model.objects.filter(pgh_obj_id=OuterRef("pk")).order_by("-pgh_id").values("pgh_id")[:1]
            )
        }
    )


def _revision_token(model, event_id):
    """Format one revision as ``app_label.Model:event_id``, naming the tracked model."""
    return f"{model._meta.concrete_model._meta.label}:{event_id}"


def object_revision(instance):
    """Return ``instance``'s newest event identifier, or ``None`` when it has none.

    ``annotate_object_revision`` is the cheaper path for a queryset on its way through a serializer.
    This one serves a caller holding one instance, such as a response reporting the revision of the
    row it just wrote. It costs one query.
    """
    if instance is None:
        return None
    model = type(instance)._meta.concrete_model
    event_model = getattr(model, "pgh_event_model", None)
    if event_model is None:
        return None
    event_id = (
        event_model.objects.filter(pgh_obj_id=instance.pk).order_by("-pgh_id").values_list("pgh_id", flat=True).first()
    )
    return None if event_id is None else _revision_token(model, event_id)


@conditional_extend_schema_field_decorator({"type": "string", "nullable": True})
class ObjectRevisionField(serializers.Field):
    """Publishes the annotated revision as ``app_label.Model:event_id``.

    Null when the object has no events yet, which is what a row written before its model was
    tracked looks like. It names the tracked model rather than the event model, so the value stays
    stable if the backend's own naming changes.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("read_only", True)
        kwargs.setdefault("source", "*")
        kwargs.setdefault("label", "Object Revision")
        kwargs.setdefault("style", {"hidden": True})
        super().__init__(**kwargs)

    def to_representation(self, instance):
        event_id = getattr(instance, REVISION_ANNOTATION, None)
        if event_id is None:
            return None
        return _revision_token(type(instance), event_id)
