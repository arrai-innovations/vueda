"""Views for history-aware who-is and workflow state history retrieval."""

__all__ = ("WorkflowStateHistoryView",)

from rest_framework import serializers
from rest_framework import status as drf_status
from rest_framework.response import Response

from vueda.core.installed_apps import workflow_enabled
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_open_api_parameter
from vueda.core.views import DynamicObjectView


class ObjectHistoryRecordSerializer(serializers.Serializer):
    id = serializers.CharField()
    state = serializers.CharField(allow_null=True)
    recorded_at = serializers.DateTimeField()
    actor = serializers.IntegerField(allow_null=True)


class WorkflowStateHistoryView(DynamicObjectView):
    """
    Return the history of the target object's workflow state.

    This is not the target model's audit log. It reports the recorded states of the object's
    ``ObjectState`` row. ``DynamicObjectView`` has already checked the target object's read
    permission by the time ``get`` runs, so the response never describes an object the caller
    cannot read.
    """

    serializer_class = ObjectHistoryRecordSerializer

    @conditional_extend_schema_decorator(
        summary="Get workflow state history",
        description="",
        parameters=[
            conditional_open_api_parameter(
                name="app_label",
                type=str,
                location="path",
                required=True,
                pattern="^[a-zA-Z0-9_]+$",
            ),
            conditional_open_api_parameter(
                name="model",
                type=str,
                location="path",
                required=True,
                pattern="^[a-zA-Z0-9_]+$",
            ),
            conditional_open_api_parameter(
                name="object_id",
                type=int,
                location="path",
                required=True,
            ),
        ],
        responses={200: ObjectHistoryRecordSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        from vueda.workflow.models import State
        from vueda.workflow.models import get_workflow_for_model

        object_state = None
        if workflow_enabled(self.object):
            # Raises WorkflowNotConfiguredError for a missing definition, rather than reporting an
            # object without history.
            get_workflow_for_model(type(self.object))
            object_state = self.object.object_state
        if object_state is None:
            return Response(
                data={"detail": "Object does not have a workflow state history."},
                exception=Exception("Object does not have a workflow state history."),
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        event_model = type(object_state).pgh_event_model
        events = event_model.objects.filter(pgh_obj_id=object_state.pk).order_by("pgh_id")
        # A state an event names may since have been deleted, so the codes come from a lookup rather
        # than from following each event's foreign key.
        state_codes = dict(State.objects.values_list("pk", "code"))
        return Response(
            [
                {
                    "id": f"{type(object_state)._meta.label}:{event.pgh_id}",
                    "state": state_codes.get(event.state_id),
                    "recorded_at": event.pgh_created_at,
                    "actor": (event.pgh_context.metadata or {}).get("user") if event.pgh_context_id else None,
                }
                for event in events.select_related("pgh_context")
            ]
        )
