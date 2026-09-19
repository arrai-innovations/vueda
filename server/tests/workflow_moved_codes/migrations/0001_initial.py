from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.auth.management import create_permissions
from django.db import migrations
from django.db import models


def make_sure_permissions_exist(apps, schema_editor):
    for app_name in ("vueda_workflow", "workflow_moved_codes"):
        app = django_apps.get_app_config(app_name)
        create_permissions(app, interactive=False)


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("employee", "0001_initial"),
        ("vueda_workflow", "__latest__"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkflowMovedFrom",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "formatted_name",
                    models.GeneratedField(
                        db_persist=True, expression=models.F("name"), output_field=models.CharField()
                    ),
                ),
                ("name", models.CharField(max_length=255)),
            ],
            options={
                "abstract": False,
                "default_permissions": ("create", "read", "update", "delete", "list"),
            },
        ),
        migrations.CreateModel(
            name="WorkflowMovedTo",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "formatted_name",
                    models.GeneratedField(
                        db_persist=True, expression=models.F("name"), output_field=models.CharField()
                    ),
                ),
                ("name", models.CharField(max_length=255)),
            ],
            options={
                "abstract": False,
                "default_permissions": ("create", "read", "update", "delete", "list"),
            },
        ),
        migrations.RunPython(
            code=make_sure_permissions_exist,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
