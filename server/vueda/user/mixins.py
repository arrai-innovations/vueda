"""Mixins for user logout context and permission layer composition."""

__all__ = (
    "LogoutMixin",
    "VUEDAPermissionsMixin",
)

from django.conf import settings
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.template.loader import render_to_string


class LogoutMixin:
    """View mixin that injects a rendered logout form into the template context."""

    def get_context_data(self, **kwargs) -> dict:
        context = super().get_context_data(**kwargs)
        context["logout"] = render_to_string("registration/logout_form.html", context=context, request=self.request)
        return context


class VUEDAPermissionsMixin(PermissionsMixin):
    """
    Extends Django's ``PermissionsMixin`` with a multi-layer permission check:

    1. Django model-level permissions (via ``super().has_perm``).
    2. Workflow state permissions (grant or deny based on the object's current state).
    3. Row-level permissions (``RowLevelPermissions.check_instance``).
    4. Workflow-aware row-level permissions (``RowLevelPermissions.check_instance_workflow``),
       which run last and can override a state deny.

    Superusers always return ``True`` and skip all checks.
    """

    class Meta:
        abstract = True

    def has_perm(self, perm, obj: models.Model | None = None) -> bool:
        # django.contrib.auth.backends.ModelBackend always returns false if object is passed, so do not pass obj and
        #  deal with it ourselves
        if self.is_superuser:
            return True
        super_value = super().has_perm(perm, obj=None)
        decision = super_value

        # Layer 2: state permissions
        grant_or_deny = None
        has_workflow = False
        if "vueda.workflow" in settings.INSTALLED_APPS:
            from vueda.core.installed_apps import workflow_enabled

            # Reading ``workflow`` raises WorkflowNotConfiguredError when the model has no definition.
            if obj is not None and workflow_enabled(obj) and obj.workflow:
                has_workflow = True
                grant_or_deny = obj.check_state_permission(perm, self.groups.all(), caller=self)

        if grant_or_deny is False:
            decision = False
        elif grant_or_deny is True:
            decision = True

        if obj:
            perm_type = perm.split(".")[1].split("_")[0]  # create, read, update, delete, list, etc.
            model = obj.__class__
            row_level_permissions = getattr(model, "RowLevelPermissions", None)

            if row_level_permissions:
                # Layer 3: row-level (skipped if state denied)
                if grant_or_deny is not False:
                    result = row_level_permissions.check_instance(model, obj, perm, self, perm_type)
                    if result is not None:
                        decision = result

                # Layer 4: workflow+row (always runs when under workflow, can override state deny)
                if has_workflow:
                    result = row_level_permissions.check_instance_workflow(
                        model, obj, perm, self, perm_type, grant_or_deny
                    )
                    if result is not None:
                        decision = result

        return bool(decision)
