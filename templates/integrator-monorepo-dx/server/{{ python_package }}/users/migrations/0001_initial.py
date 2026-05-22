import django.contrib.postgres.indexes
import django.utils.timezone
import vueda.user.models
from django.contrib.postgres.operations import CreateCollation, TrigramExtension
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [  # noqa: RUF012
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [  # noqa: RUF012
        TrigramExtension(),
        CreateCollation(
            "case_insensitive",
            provider="icu",
            locale="und-u-ks-level2",
            deterministic=False,
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                (
                    "email",
                    models.EmailField(
                        db_collation="case_insensitive", max_length=254, unique=True, verbose_name="email address"
                    ),
                ),
                ("name", models.CharField(max_length=255, verbose_name="name")),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now, verbose_name="date joined")),
                ("is_system", models.BooleanField(default=False, verbose_name="system")),
                (
                    "formatted_name",
                    models.GeneratedField(
                        db_persist=True, expression=models.F("email"), output_field=models.CharField()
                    ),
                ),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "ordering": ("-date_joined",),
                "permissions": [("list_permission", "Can list permissions")],
                "abstract": False,
                "default_permissions": ("create", "read", "update", "delete", "list"),
                "default_related_name": "users",
                "indexes": [
                    django.contrib.postgres.indexes.GinIndex(
                        fields=["email"], name="gin_email_idx", opclasses=["gin_trgm_ops"]
                    ),
                    django.contrib.postgres.indexes.GinIndex(
                        fields=["name"], name="gin_name_idx", opclasses=["gin_trgm_ops"]
                    ),
                ],
            },
            managers=[
                ("objects", vueda.user.models.VUEDAUserManager()),
            ],
        ),
    ]
