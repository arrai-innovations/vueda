from django.contrib.auth.mixins import PermissionRequiredMixin  # noqa: F401
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied
from django.views.generic import TemplateView

from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


class HasWorkflowViewMixin:
    """
    Mixin for rest_framework Views or ViewSets that will have a workflow object related to their object's model.

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


HasWorkflowViewSetMixin = HasWorkflowViewMixin


# PermissionRequiredMixin
class WorkflowOverviewView(TemplateView):
    """
    Provide an overview of workflows, showing states and transitions for each content type, grouped by app.
    """

    template_name = "workflow/overview.html"

    permission_required = ("workflow.read_workflow",)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["workflows"] = []
        for workflow in (
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
        ):
            workflow = {
                "pk": workflow.pk,
                "content_type_id": workflow.content_type.pk,
                "app_label": workflow.content_type.app_label,
                "model": workflow.content_type.model,
                "has_mixin": issubclass(workflow.content_type.model_class(), HasWorkflowModelMixin),
            }
            states = []

            """
            # State
            workflow
            # InitialState
            workflow
            state

            # Transition
            workflow
            target
            # TransitionPermission
            transition
            permission
            # TransitionSource
            transition
            source

            # WorkflowPermission
            workflow
            permission

            # StatePermission
            state
            permission
            group
            grant_or_deny
            """

            workflow["states"] = states

            context["workflows"].append(workflow)

        # we also want to warn about model classes that inherit from HasWorkflowMixin, but do not have a workflow.
        context["models_without_workflow_mixin"] = []
        for model in HasWorkflowModelMixin.__subclasses__():
            content_type = ContentType.objects.get_for_model(model)
            if not Workflow.objects.filter(content_type=ContentType.objects.get_for_model(model)).exists():
                context["models_without_workflow_mixin"].append(
                    (content_type.app_label, content_type.model, model.__name__)
                )
        return context
