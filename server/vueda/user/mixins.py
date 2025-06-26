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

        # workflow row level permissions
        #  you can be granted or denied permissions by workflow state, so we need to check regardless of super value
        grant_or_deny = None
        if "vueda.workflow" in settings.INSTALLED_APPS:
            from vueda.workflow.models import HasWorkflowModelMixin

            if isinstance(obj, HasWorkflowModelMixin) and obj.workflow:
                # Don't raise an error if you get to this point without having a workflow set up.
                grant_or_deny = obj.check_state_permission(perm, self.groups.all())

        # `grant_or_deny` is expected to be None if obj is not a `HasWorkflowModelMixin` or if it has no workflow
        #  or if there are no explicit state permissions for the user's groups.
        # this leads to some interesting looking conditions below.

        if not super_value and not grant_or_deny:
            return False

        if super_value or grant_or_deny:
            if obj:
                # workflow row level permissions
                if grant_or_deny is False:
                    return False
                # row level permissions
                perm_type = perm.split(".")[1].split("_")[0]  # create, read, update, delete, list, etc.
                model = obj.__class__
                # noinspection PyProtectedMember
                row_level_permissions = getattr(model, "RowLevelPermissions", None)
                if row_level_permissions:
                    # duck typing, if it has the method, good enough
                    result = row_level_permissions.check_instance(model, obj, perm, self, perm_type)
                    # None means it didn't have an opinion, so we will just return the super value
                    if result is None:
                        return super_value
                    return result
                else:
                    # no row level permissions defined for this model, so we will just return True
                    return True
            else:
                # model level permissions
                return True
        return False
