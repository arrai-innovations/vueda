from typing import Optional
from typing import Union

from django.conf import settings
from django.db.models import Q
from rest_framework import exceptions
from rest_framework.permissions import DjangoObjectPermissions


class ObjectPermissions(DjangoObjectPermissions):
    """
    Extends DjangoObjectPermissions to support state permissions and CRUDL naming conventions.
    It sets the 'view_action' in permission checks to determine required permissions for views
    and objects based on the current action in the view.
    """

    perms_map = {
        "GET": [lambda action: f"%(app_label)s.{'list' if action == 'list' else 'read'}_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.create_%(model_name)s"],
        "PUT": ["%(app_label)s.update_%(model_name)s"],
        "PATCH": ["%(app_label)s.update_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }
    view_action = None

    def has_permission(self, request, view):
        """
        Bypasses model-level permissions check for models with workflow state permissions,
        delegating the decision to object-level permissions if applicable.
        """
        # this is only going to work if workflow is installed
        if "vueda.workflow" in settings.INSTALLED_APPS:
            from vueda.workflow.models import HasWorkflowModelMixin
            from vueda.workflow.models import StatePermission
            from vueda.workflow.models import Workflow

            queryset = view.get_queryset()
            model = queryset.model
            if issubclass(model, HasWorkflowModelMixin):
                workflow = Workflow.objects.filter(content_type=model.content_type()).first()
                if (
                    workflow
                    and StatePermission.objects.filter(
                        state__workflow=workflow,
                        group__in=request.user.groups.all(),
                        permission__codename__in=self.get_required_permissions(request.method, model),
                        grant_or_deny=True,
                    ).exists()
                ):
                    return True
        # set the view action for use in get_required_permissions
        self.view_action = view.action
        return super().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        # set the view action for use in get_required_object_permissions
        self.view_action = view.action
        return super().has_object_permission(request, view, obj)

    def get_required_permissions(self, method, model_cls):
        """
        Allow dynamic permissions based on the view action, for callables in perms_map.
        """
        kwargs = {"app_label": model_cls._meta.app_label, "model_name": model_cls._meta.model_name}

        if method not in self.perms_map:
            raise exceptions.MethodNotAllowed(method)

        called = [perm(self.view_action) if callable(perm) else perm for perm in self.perms_map[method]]
        return [perm % kwargs for perm in called if perm]  # noqa: S001

    def get_required_object_permissions(self, method, model_cls):
        """
        Allow dynamic permissions based on the view action, for callables in perms_map, for object permissions.
        """
        return self.get_required_permissions(method, model_cls)


DEFAULT = object()


class BaseRowLevelPermissions:
    @classmethod
    def check_instance(cls, model, obj, perm, user, perm_type) -> Optional[bool]:
        """
        True if the user has the permission, False if the user does not have the permission, None if the check is not
        applicable due to there being no row level permissions for the model.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_queryset(cls, queryset, perm, user, perm_type) -> Union[Q, bool, None]:
        """
        Return of None means do not filter based on row level permissions.
        Return of True means the user has the permission without needing to check the rows.
        Return of False means the user does not have the permission, and we can stop checking.
        Return of Q means we need to filter the rows based on the row level permissions.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None
