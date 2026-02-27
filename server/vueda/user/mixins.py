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
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["logout"] = render_to_string("registration/logout_form.html", context=context, request=self.request)
        return context


class VUEDAPermissionsMixin(PermissionsMixin):
    class Meta:
        abstract = True

    def has_perm(self, perm, obj: models.Model | None = None):
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
            from vueda.workflow.models import HasWorkflowModelMixin

            if isinstance(obj, HasWorkflowModelMixin) and obj.workflow:
                has_workflow = True
                grant_or_deny = obj.check_state_permission(perm, self.groups.all())

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
