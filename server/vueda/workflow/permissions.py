"""DRF permission class for workflow-aware content-type endpoints."""

__all__ = ("WorkflowObjectPermissions",)

from vueda.core.permissions import DynamicObjectPermissions


class WorkflowObjectPermissions(DynamicObjectPermissions):
    """
    Target-model permissions for workflow endpoints that address a target model's data.

    The view names its target model through ``app_label`` and ``model``, and lists the actions
    that carry a target-model gate in ``target_model_permission_actions``.

    Workflow definition endpoints describe the workflow itself rather than any object under it.
    They carry the ``vueda_workflow.read_workflow`` gate the viewset applies, and no target-model
    gate, so a target-model permission neither admits nor denies them.
    """

    def has_permission(self, request, view) -> bool:
        """Apply the target-model gate only to the actions that address target-model data."""
        if getattr(view, "action", None) not in getattr(view, "target_model_permission_actions", ()):
            return bool(request.user and (request.user.is_authenticated or not self.authenticated_users_only))
        return super().has_permission(request, view)
