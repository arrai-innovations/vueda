from django.contrib.postgres.indexes import GinIndex
from django.db import models

from vueda.user.models import AbstractVUEDAUser


class GroupChangesSyncingUser(AbstractVUEDAUser):
    email = models.EmailField("email address", unique=True, db_collation="case_insensitive_group_changes_syncing")
    groups = models.ManyToManyField(
        "auth.Group",
        verbose_name="groups",
        blank=True,
        help_text=("The groups this user belongs to. A user will get all permissions granted to each of their groups."),
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        verbose_name="user permissions",
        blank=True,
        help_text=("Specific permissions for this user."),
    )

    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "group_changes_syncing_users"
        indexes = [
            GinIndex(fields=["email"], name="gin_email_group_changes_syncing_idx", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name"], name="gin_name_group_changes_syncing_idx", opclasses=["gin_trgm_ops"]),
        ]
