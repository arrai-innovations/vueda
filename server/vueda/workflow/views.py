from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import HttpResponse
from django.views.generic import TemplateView
from rest_framework import status as drf_status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow
from vueda.workflow.permissions import VuedaGenericObjectPermission


class HasWorkflowViewMixin:
    """
    User.has_perm with obj=None is too late to check for state permissions, which are always 'row' level.
    We need to skip User.has_perm(..., obj=None) if state permissions are defined.
    """

    def check_permissions(self, request):
        # workflow state permissions are inherently row level, so skip the generic check if we have state permissions
        model = self.get_queryset().model

        # catch PermissionDenied to delay if we have state permissions
        # if we just call super after, we let anonymous users in
        super_error = None
        super_value = None
        try:
            super_value = super().check_permissions(request)
        except PermissionDenied as e:
            super_error = e
        if issubclass(model, HasWorkflowModelMixin):
            workflow = Workflow.objects.filter(content_type=model.content_type()).first()
            if StatePermission.objects.filter(state__workflow=workflow).exists():
                return True
        if super_error:
            raise super_error
        return super_value


class WorkflowView(APIView):
    permission_classes = [
        VuedaGenericObjectPermission,
    ]

    def __init__(self):
        super().__init__()
        self.object = None

    def dispatch(self, request, *args, **kwargs):
        self.object = self.get_object(kwargs["app_label"], kwargs["model"], kwargs["object_id"])
        if not isinstance(self.object, HasWorkflowModelMixin):
            return HttpResponse("Object does not have a workflow.")
        return super().dispatch(request, *args, **kwargs)

    def get_object(self, app_label, model, object_id):
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        return get_object_or_404(content_type.model_class(), pk=object_id)


class GetObjectStateView(WorkflowView):
    def get(self, request, *args, **kwargs):
        user = request.user
        app_label = kwargs["app_label"]
        model = kwargs["model"]
        if not user.has_perm(f"{app_label}.read_{model.replace('_', '')}", obj=self.object):
            err_msg = "You do not have permission to perform this action."
            return Response(
                data={"detail": err_msg},
                exception=PermissionDenied(err_msg),
                status=drf_status.HTTP_403_FORBIDDEN,
            )

        state = self.object.workflow_state
        history_id = self.object.object_state.history.latest().id
        return Response(
            {
                "state": {"code": state.code, "name": state.name},
                "current_history_id": history_id,
            }
        )


class GetObjectTransitionsView(WorkflowView):
    def get(self, request, *args, **kwargs):
        return Response(list(self.object.available_transitions(request.user).order_by("name").values("code", "name")))


class ExecuteTransitionView(WorkflowView):
    def patch(self, request, *args, **kwargs):
        with transaction.atomic():
            transition_code = request.data.get("transition_code")
            state, current_history_id = self.object.apply_transition(transition_code, user=request.user)
            return Response(
                {
                    "new_state": {
                        "state": {"code": state.code, "name": state.name},
                        "current_history_id": current_history_id,
                    },
                    "new_transitions": list(
                        self.object.available_transitions(request.user).order_by("name").values("code", "name")
                    ),
                }
            )


class GetObjectHistoryView(WorkflowView):
    def get(self, request, *args, **kwargs):
        user = request.user
        app_label = kwargs["app_label"]
        model = kwargs["model"]
        if not user.has_perm(f"{app_label}.read_{model.replace('_', '')}", obj=self.object):
            err_msg = "You do not have permission to perform this action."
            return Response(
                data={"detail": err_msg},
                exception=PermissionDenied(err_msg),
                status=drf_status.HTTP_403_FORBIDDEN,
            )
        return Response(
            list(
                self.object.object_state.history.values(
                    "history_id", "state__code", "history_change_reason", "history_date", "history_user"
                )
            )
        )


class GetStatesForContentTypeView(APIView):
    def get(self, request, *args, **kwargs):
        content_type = get_object_or_404(
            ContentType, app_label=kwargs["app_label"], model=kwargs["model"].replace("_", "")
        )
        workflow = get_object_or_404(Workflow, content_type=content_type)
        return Response(list(workflow.states.order_by("id").values("id", "code", "name")))


class WorkflowOverviewView(TemplateView):
    """
    Provide an overview of workflows, showing states and transitions for each content type, grouped by app.
    """

    template_name = "workflows.jinja2"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        workflows = (
            Workflow.objects.all()
            .select_related("content_type", "initial_state")
            .prefetch_related(
                "states",
                "states__state_permissions",
                "transitions",
                "transitions__target",
                "transitions__transition_permissions",
                "transitions__transition_sources",
                "workflow_permissions",
            )
        )
        # organize workflows by app
        context["apps"] = {}
        for workflow in workflows:
            app_label = workflow.content_type.app_label
            model_cls = workflow.content_type.model_class()
            if app_label not in context["apps"]:
                context["apps"][app_label] = {}
            context["apps"][app_label][model_cls] = workflow
        # we want to warn about model classes that have workflow, but do not inherit from HasWorkflowMixin.
        context["models_without_workflow_row"] = []
        for workflow in workflows:
            model = workflow.content_type.model_class()
            if not issubclass(model, HasWorkflowModelMixin):
                context["models_without_workflow_row"].append(
                    (workflow.content_type.app_label, workflow.content_type.model, model.__name__)
                )
        # we also want to warn about model classes that inherit from HasWorkflowMixin, but do not have a workflow.
        context["models_without_workflow_mixin"] = []
        for model in HasWorkflowModelMixin.__subclasses__():
            content_type = ContentType.objects.get_for_model(model)
            if not Workflow.objects.filter(content_type=ContentType.objects.get_for_model(model)).exists():
                context["models_without_workflow_mixin"].append(
                    (content_type.app_label, content_type.model, model.__name__)
                )
        return context
