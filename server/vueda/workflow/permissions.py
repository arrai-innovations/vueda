from vueda.core.permissions import VUEDAObjectPermissions
from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


class VUEDAWorkflowObjectPermissions(VUEDAObjectPermissions):
    """
    Plug workflow state permissions into the DRF object permissions.
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

    def has_permission(self, request, view):
        """
        State permissions are inherently object permissions, so skip the generic permission check here.
        """
        # workflow state permissions are inherently row level, so skip the generic check if we have state permissions
        model = self._queryset(view).model

        if issubclass(model, HasWorkflowModelMixin):
            workflow = Workflow.objects.filter(content_type=model.content_type()).first()
            if StatePermission.objects.filter(state__workflow=workflow).exists():
                return True
        return super().has_permission(request, view)
