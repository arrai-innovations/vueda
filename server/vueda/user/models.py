from urllib.parse import urljoin

from allauth.mfa.models import Authenticator
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import UserManager
from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.db.models import F
from django.utils import timezone
from hashids import Hashids
from phonenumber_field.modelfields import PhoneNumberField
from simple_history.models import HistoricalRecords

from vueda.core.models import ActivatableBaseModel
from vueda.core.models import BaseModelMeta
from vueda.core.models import VuedaBaseModel
from vueda.core.tokens import Sha3PasswordResetTokenGenerator
from vueda.user.mixins import VUEDAPermissionsMixin


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
        queryset = super().get_queryset()
        return queryset.annotate(
            current_history_id=models.Subquery(
                queryset.filter(history_records__id=models.OuterRef("pk"))
                .annotate(current_history_id=models.Max("history_records__history_id"))
                .values("current_history_id")
            )
        )


class AbstractVUEDAUserMeta(BaseModelMeta):
    ordering = ("-date_joined",)
    default_related_name = "users"
    permissions = [
        ("list_permission", "Can list permissions"),
    ]
    indexes = [
        GinIndex(fields=["email"], name="gin_email_idx", opclasses=["gin_trgm_ops"]),
        GinIndex(fields=["name"], name="gin_name_idx", opclasses=["gin_trgm_ops"]),
    ]


class AbstractVUEDAUser(AbstractBaseUser, ActivatableBaseModel, VUEDAPermissionsMixin):
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

    formatted_name = models.GeneratedField(
        expression=F(EMAIL_FIELD),
        output_field=models.CharField(),
        db_persist=True,
    )

    objects = VUEDAUserManager()

    class Meta(AbstractVUEDAUserMeta):
        abstract = True

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

    def generate_reset_url(self):
        """
        Generates a password reset URL for the given user.
        """
        token_generator = Sha3PasswordResetTokenGenerator()
        hashids = Hashids(min_length=16)
        return (
            urljoin(
                f"https://{settings.FRONTEND_DOMAIN}{settings.FRONTEND_RESET_URL}",
                hashids.encode(self.pk),
            )
            + "?token="
            + token_generator.make_token(self)
        )


class AbstractVUEDAUserWithHistory(AbstractVUEDAUser):
    objects = VUEDAUserWithHistoryManager()

    history = HistoricalRecords(related_name="history_records", inherit=True)

    class Meta(AbstractVUEDAUserMeta):
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


TWO_FACTOR_AUTHENTICATION_OPTIONS = [
    ("sms", "Phone SMS"),
    ("email", "Email"),
    ("totp", "Time Based Key from an Authenticator App"),
]


class TOTPDevice(VuedaBaseModel):
    authenticator = models.ForeignKey(Authenticator, on_delete=models.CASCADE, related_name="device")
    method = models.CharField(max_length=255, choices=TWO_FACTOR_AUTHENTICATION_OPTIONS)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="totp_devices",
    )
    phone_number = PhoneNumberField(blank=True, null=True)
    email = models.EmailField(blank=True, default="")
    formatted_name = None

    def __str__(self):
        return f"TOTP Device {self.method}"

    class Meta(BaseModelMeta):
        default_related_name = "totp_devices"
        constraints = [
            models.UniqueConstraint(
                fields=["authenticator", "method", "user"],
                name="uniq_authenticator_method_user",
            ),
        ]

    def get_formatted_name(self):
        return self.get_method_display()
