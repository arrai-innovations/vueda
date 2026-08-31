"""Object-level and row-level permission classes for CRUDL and workflow integration."""

__all__ = (
    "DEFAULT",
    "BaseRowLevelPermissions",
    "ObjectPermissions",
)

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
    object_permission_actions = frozenset(("destroy", "partial_update", "retrieve", "update"))

    def _has_later_permission_decision(self, view) -> bool:
        """Return whether this action has a guaranteed state-aware decision after model scope."""
        action = self.view_action
        if action in self.object_permission_actions:
            return True
        if action == "list":
            return getattr(view, "applies_workflow_state_list_filter", False)
        return action in getattr(view, "workflow_object_permission_actions", ())

    def has_permission(self, request, view) -> bool:
        """
        Defer a model-level denial only when a matching state grant can be decided later.

        Object-scoped actions defer to ``has_object_permission``. Framework list actions defer
        to their workflow-aware queryset filter. Collection writes, including create, retain the
        model-level result because no existing object supplies a workflow state.
        """
        self.view_action = getattr(view, "action", None)
        model_permission = super().has_permission(request, view)
        if model_permission or not request.user.is_authenticated or not self._has_later_permission_decision(view):
            return model_permission

        # this is only going to work if workflow is installed
        if "vueda.workflow" in settings.INSTALLED_APPS:
            from django.contrib.contenttypes.models import ContentType

            from vueda.workflow.models import HasWorkflowModelMixin
            from vueda.workflow.models import StatePermission
            from vueda.workflow.models import Workflow

            queryset = view.get_queryset()
            model = queryset.model
            if issubclass(model, HasWorkflowModelMixin):
                workflow = Workflow.objects.filter(content_type=model.get_content_type()).first()
                codenames = [
                    perm.rsplit(".", maxsplit=1)[-1] for perm in self.get_required_permissions(request.method, model)
                ]
                if (
                    workflow
                    and StatePermission.objects.filter(
                        state__workflow=workflow,
                        group__in=request.user.groups.all(),
                        permission__codename__in=codenames,
                        permission__content_type=ContentType.objects.get_for_model(model),
                        grant_or_deny=True,
                    ).exists()
                ):
                    return True
        return model_permission

    def has_object_permission(self, request, view, obj) -> bool:
        """Records the current view action then delegates to DjangoObjectPermissions."""
        # set the view action for use in get_required_object_permissions
        self.view_action = getattr(view, "action", None)
        return super().has_object_permission(request, view, obj)

    def get_required_permissions(self, method, model_cls) -> list[str]:
        """
        Allow dynamic permissions based on the view action, for callables in perms_map.
        """
        kwargs = {"app_label": model_cls._meta.app_label, "model_name": model_cls._meta.model_name}

        if method not in self.perms_map:
            raise exceptions.MethodNotAllowed(method)

        called = [perm(self.view_action) if callable(perm) else perm for perm in self.perms_map[method]]
        return [perm % kwargs for perm in called if perm]

    def get_required_object_permissions(self, method, model_cls) -> list[str]:
        """
        Allow dynamic permissions based on the view action, for callables in perms_map, for object permissions.
        """
        return self.get_required_permissions(method, model_cls)


DEFAULT = object()


class BaseRowLevelPermissions:
    """
    Base class for row-level permission checks. Subclass this on a model's inner
    ``RowLevelPermissions`` class to restrict which rows a user can read, modify, or delete.

    All methods return ``None`` by default (no opinion). Return ``True`` to grant, ``False``
    to deny, or a ``Q`` object (queryset methods) to filter rows.
    """

    @classmethod
    def check_instance(cls, model, obj, perm, user, perm_type) -> bool | None:
        """
        True if the user has the permission, False if the user does not have the permission, None if the check is not
        applicable due to there being no row level permissions for the model.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_queryset(cls, queryset, perm, user, perm_type) -> Q | bool | None:
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

    @classmethod
    def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny) -> bool | None:
        """
        Row-level check that is workflow-aware. Only called when the object is under workflow.
        Receives grant_or_deny (None/True/False) from state permission resolution.
        Runs AFTER check_instance and can override any prior decision, including state deny.
        """
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_queryset_workflow(
        cls, queryset, perm, user, perm_type, state_denied_annotation, state_granted_annotation
    ) -> Q | bool | None:
        """
        Queryset-level filter that is workflow-aware. Only called when the model is under workflow.
        The queryset is pre-annotated with state permission info.
        Use F(state_denied_annotation) / F(state_granted_annotation) in Q expressions.

        Returns:
            None  - no workflow-specific opinion, preserve prior filtering
            Q     - ANDed with the current queryset
            True  - no additional restriction
            False - empty queryset
        """
        if user.is_superuser:
            return None
        return None
