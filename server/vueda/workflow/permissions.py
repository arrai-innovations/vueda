from django.contrib.contenttypes.models import ContentType
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import DjangoObjectPermissions

from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


class VuedaGenericObjectPermission(DjangoObjectPermissions):
    """
    Customize version to deal with dynamic content types.
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
        The way this is used in DjangoObjectPermissions and DjangoModelPermissions
        right now is to just use the queryset to get the model_class.

        That kinda seems round about, especially for this class were we have the content_type_id.
        """
        # future: Since this is a private method, we should check this during updates to DRF.
        # get the app_label & model being requested by the user.
        app_label = view.kwargs.get("app_label")
        model = view.kwargs.get("model")
        # and get the model class for that app_label & model
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        model_class = content_type.model_class()
        # and return the queryset for that model class
        return model_class.objects.all()

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
