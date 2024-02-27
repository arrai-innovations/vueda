from typing import Optional

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.models import UserManager
from django.db import models
from django.utils import timezone

from vueda.core.models import ActivatableBaseModel
from vueda.core.models import BaseModelMeta


class AbstractVUEDAUser(AbstractBaseUser, ActivatableBaseModel, PermissionsMixin):
    """
    Default user for VUEDA

    Verses django default, it features:
    - row level permissions, via Meta.row_level_permissions.check_instance, see BaseRowLevelPermissions
    - workflow state permissions
    - email as the unique identifier
    - email as a case-insensitive unique field
    - name as a required field
    - name as a single field, instead of first_name and last_name
    - is_system flag
    """

    email = models.EmailField("email address", unique=True, db_collation="case_insensitive")
    name = models.CharField("name", max_length=255)
    # name matters, django contrib.auth.backends.ModelBackend.user_can_authenticate checks for is_active
    date_joined = models.DateTimeField("date joined", default=timezone.now)
    is_system = models.BooleanField(
        "system",
        default=False,
    )

    EMAIL_FIELD = "email"
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta(BaseModelMeta):
        abstract = True
        ordering = ("-date_joined",)
        default_related_name = "users"

    def has_perm(self, perm, obj: Optional[models.Model] = None):
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

            if isinstance(obj, HasWorkflowModelMixin):
                if obj.workflow:
                    grant_or_deny = obj.check_state_permission(perm, self.groups.all())
                else:
                    raise ValueError("Object has no workflow, but is a HasWorkflowModelMixin.")

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
                row_level_permissions = getattr(model._meta, "row_level_permissions", None)
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

    def __str__(self):
        return f"{self.email}"

    def send_welcome_email(self):
        pass
        # name = self.name or self.get_username()
        # todo: send email
        # email = EmailMessageModel.objects.create(
        #     subject="Welcome To Treature",
        #     from_email=settings.DEFAULT_FROM_EMAIL,
        #     to=[self.email],
        #     body=f"""Welcome,
        #     {name}
        #
        #     Visit the site at:
        #     https://{settings.FRONTEND_DOMAIN}
        #     """,
        # )
        # email.send_email()
