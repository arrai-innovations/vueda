from django.db import transaction
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.mixins import ListModelMixin
from rest_framework.mixins import RetrieveModelMixin
from rest_framework.response import Response

from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_open_api_parameter
from vueda.core.open_api import conditional_open_api_types
from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import Workflow
from vueda.workflow.serializers import WorkflowSerializer


class WorkflowViewSet(RetrieveModelMixin, ListModelMixin, viewsets.GenericViewSet):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer

    def get_workflow(self):
        return get_object_or_404(
            Workflow, content_type__app_label=self.kwargs["app_label"], content_type__model=self.kwargs["model"]
        )

    def get_object(self):
        return get_object_or_404(self.workflow.content_type.model_class(), pk=self.kwargs["object_id"])

    def dispatch(self, request, *args, **kwargs):
        self.workflow = self.get_workflow()
        self.object = self.get_object()
        return super().dispatch(request, *args, **kwargs)

    def check_permissions(self, request):
        # you need Workflow read permission to get / list / action the workflow, at minimum
        if not request.user.has_perm("workflow.read_workflow"):
            raise PermissionDenied("You do not have permission to perform this action.")
        return super().check_permissions(request)

    @conditional_extend_schema_decorator(
        parameters=[conditional_open_api_parameter("object_id", conditional_open_api_types().STR, location="path")]
    )
    @action(detail=True, methods=["get"], url_path=r"object-state/(?P<object_id>[^/.]+)")
    def object_state(self, request, *args, **kwargs):
        user = request.user
        app_label = kwargs["app_label"]
        model = kwargs["model"]
        if not isinstance(self.object, HasWorkflowModelMixin):
            return Response(
                data={"detail": "Object does not have a workflow."},
                exception=Exception("Object does not have a workflow."),
                status=drf_status.HTTP_404_NOT_FOUND,
            )
        if not user.has_perm(f"{app_label}.read_{model.replace('_', '')}", obj=self.object):
            err_msg = "You do not have permission to perform this action."
            return Response(
                data={"detail": err_msg},
                exception=PermissionDenied(err_msg),
                status=drf_status.HTTP_403_FORBIDDEN,
            )

        state = self.object.workflow_state
        response_data = {
            "state": {"code": state.code, "name": state.name},
        }
        if hasattr(self.object.object_state, "history"):
            current_history_id = self.object.object_state.history.latest().id
            response_data["current_history_id"] = current_history_id
        return Response(response_data)

    @conditional_extend_schema_decorator(
        parameters=[conditional_open_api_parameter("object_id", conditional_open_api_types().STR, location="path")]
    )
    @action(detail=True, methods=["get"], url_path=r"object-transitions/(?P<object_id>[^/.]+)")
    def object_transitions(self, request, *args, **kwargs):
        return Response(list(self.object.available_transitions(request.user).order_by("name").values("code", "name")))

    @conditional_extend_schema_decorator(
        parameters=[conditional_open_api_parameter("object_id", conditional_open_api_types().STR, location="path")]
    )
    @action(detail=True, methods=["patch"], url_path=r"execute-transition/(?P<object_id>[^/.]+)")
    def execute_transition(self, request, *args, **kwargs):
        with transaction.atomic():
            transition_code = request.data.get("transition_code")
            # apply_transition does the permission checks
            state, current_history_id = self.object.apply_transition(transition_code, user=request.user)
            response_data = {
                "new_state": {
                    "state": {"code": state.code, "name": state.name},
                },
                "new_transitions": list(
                    self.object.available_transitions(request.user).order_by("name").values("code", "name")
                ),
            }
            if current_history_id:
                response_data["new_state"]["current_history_id"] = current_history_id
            return Response(response_data)
