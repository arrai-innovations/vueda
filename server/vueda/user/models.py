from typing import Optional

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.models import UserManager
from django.db import models
from django.utils import timezone
from simple_history.models import HistoricalRecords

from vueda.core.models import ActivatableBaseModel
from vueda.core.models import BaseModelMeta


class VUEDAUserManager(UserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """
        Create and save a user with the given username, email, and password.
        """
        email = self.normalize_email(email)
        # Lookup the real model class from the global app registry so this
        # manager method can be used in migrations. This is fine because
        # managers are by definition working on the real model.
        user = self.model(email=email, **extra_fields)
        user.password = make_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class VUEDAUserWithHistoryManager(VUEDAUserManager):
    def get_queryset(self):
        return super().get_queryset().annotate(current_history_id=models.Max("history_records__history_id"))


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

    objects = VUEDAUserManager()

    class Meta(BaseModelMeta):
        abstract = True
        ordering = ("-date_joined",)
        default_related_name = "users"
        permissions = [
            ("list_permission", "Can list permissions"),
        ]

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


class AbstractVUEDAUserWithHistory(AbstractVUEDAUser):
    objects = VUEDAUserWithHistoryManager()

    history = HistoricalRecords(related_name="history_records", inherit=True)

    class Meta(AbstractVUEDAUser.Meta):
        abstract = True


class GroupChange(models.Model):
    """
    For local use of the permission overview screen, where you can add/edit/delete groups, we
    need to keep track of group changes, since they don't have history.  With this info, we
    can make migrations based on the changes.  So, this model will store group changes, and
    then the `makegroupmigrations` management command will clear this table when it is done.
    In case permissions are deleted, we store the historical values from the permission, instead
    of a foreign key, since the ids can be different on machines where the migration is run.
    """

    ADDED = "added"
    ASSOCIATED = "associated"
    CHANGED = "changed"
    UNASSOCIATED = "unassociated"
    DELETED = "deleted"

    group_name = models.CharField(max_length=100, blank=True)
    group_name_old = models.CharField(max_length=100, blank=True)
    change_type = models.CharField(
        max_length=100,
        choices=(
            (ADDED, ADDED),
            (ASSOCIATED, ASSOCIATED),
            (CHANGED, CHANGED),
            (UNASSOCIATED, UNASSOCIATED),
            (DELETED, DELETED),
        ),
    )
    when = models.DateTimeField(auto_now=True)
    historical_permission_codename = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_app_label = models.CharField(max_length=100, blank=True)
    historical_permission_content_type_model_name = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "group_change"
        verbose_name_plural = "group_changes"

    def __str__(self):
        return (
            f"Group {self.group_name} for permission {self.historical_permission_codename} "
            f"({self.historical_permission_content_type_app_label}, "
            f"{self.historical_permission_content_type_model_name}"
        )
