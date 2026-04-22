from django.contrib.postgres.indexes import GinIndex
from django.db import models

from vueda.user.models import AbstractVUEDAUser


class GroupDeletedUser(AbstractVUEDAUser):
    email = models.EmailField("email address", unique=True, db_collation="case_insensitive_group_deleted")
    groups = models.ManyToManyField(
        "auth.Group",
        verbose_name="groups",
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        verbose_name="user permissions",
        blank=True,
    )

    class Meta(AbstractVUEDAUser.Meta):
        default_related_name = "group_deleted_users"
        indexes = [
            GinIndex(fields=["email"], name="gin_email_group_deleted_idx", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name"], name="gin_name_group_deleted_idx", opclasses=["gin_trgm_ops"]),
        ]
