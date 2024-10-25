from rest_framework.generics import get_object_or_404

from vueda.core.permissions import DjangoObjectPermissions
from vueda.workflow.models import HasWorkflowModelMixin


class WorkflowObjectPermissions(DjangoObjectPermissions):
    """
    For use with inheritors of WorkflowView, where the content type to have permissions checked for is dynamic.
    Assumes that the view arguments include app_label, model, and object_id.
    """

    perms_map = {
        "GET": ["%(app_label)s.read_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.create_%(model_name)s"],
        "PUT": ["%(app_label)s.update_%(model_name)s"],
        "PATCH": ["%(app_label)s.update_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }

    def _queryset(self, view):
        """
        Get a queryset for the model in question.
        """
        # Local import, so we can modify the perms_map before the apps are ready.
        from django.contrib.contenttypes.models import ContentType

        app_label = view.kwargs.get("app_label")
        model = view.kwargs.get("model")
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        model_class = content_type.model_class()
        return model_class.objects.all()

    def has_permission(self, request, view):
        """
        Bypasses model-level permissions check for models with workflow state permissions,
        delegating the decision to object-level permissions if applicable.
        """
        # Local import, so we can modify the perms_map before the apps are ready.
        from vueda.workflow.models import StatePermission
        from vueda.workflow.models import Workflow

        model = self._queryset(view).model

        if issubclass(model, HasWorkflowModelMixin):
            workflow = Workflow.objects.filter(content_type=model.content_type()).first()
            if StatePermission.objects.filter(state__workflow=workflow).exists():
                return True
        return super().has_permission(request, view)
