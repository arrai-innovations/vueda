from django.contrib.postgres.indexes import GinIndex
from django.db import models

from vueda.user.models import AbstractVUEDAUser


class GroupAddedUser(AbstractVUEDAUser):
    email = models.EmailField("email address", unique=True, db_collation="case_insensitive_group_added")
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
        default_related_name = "group_added_users"
        indexes = [
            GinIndex(fields=["email"], name="gin_email_group_added_idx", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name"], name="gin_name_group_added_idx", opclasses=["gin_trgm_ops"]),
        ]
