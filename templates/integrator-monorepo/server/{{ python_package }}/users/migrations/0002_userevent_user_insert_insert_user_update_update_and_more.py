import django.db.models.deletion
import django.utils.timezone
import pgtrigger.compiler
import pgtrigger.migrations
from django.conf import settings
from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("pghistory", "0007_auto_20250421_0444"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserEvent",
            fields=[
                ("pgh_id", models.AutoField(primary_key=True, serialize=False)),
                ("pgh_created_at", models.DateTimeField(auto_now_add=True)),
                ("pgh_label", models.TextField(help_text="The event label.")),
                ("id", models.IntegerField()),
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
                        db_collation="case_insensitive",
                        max_length=254,
                        verbose_name="email address",
                    ),
                ),
                ("name", models.CharField(max_length=255, verbose_name="name")),
                (
                    "date_joined",
                    models.DateTimeField(default=django.utils.timezone.now, verbose_name="date joined"),
                ),
                (
                    "is_system",
                    models.BooleanField(default=False, verbose_name="system"),
                ),
                (
                    "formatted_name",
                    models.GeneratedField(
                        db_persist=True,
                        expression=models.F("email"),
                        output_field=models.CharField(),
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="user",
            trigger=pgtrigger.compiler.Trigger(
                name="insert_insert",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func='INSERT INTO "users_userevent" ("date_joined", "email", "id", "is_active", "is_superuser", "is_system", "name", "pgh_context_id", "pgh_created_at", "pgh_label", "pgh_obj_id") VALUES (NEW."date_joined", NEW."email", NEW."id", NEW."is_active", NEW."is_superuser", NEW."is_system", NEW."name", _pgh_attach_context(), NOW(), \'insert\', NEW."id"); RETURN NULL;',
                    hash="550e4a91f6549af4b04396a20edf03f40df2aa73",
                    operation="INSERT",
                    pgid="pgtrigger_insert_insert_52e78",
                    table="users_user",
                    when="AFTER",
                ),
            ),
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="user",
            trigger=pgtrigger.compiler.Trigger(
                name="update_update",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    condition='WHEN (OLD."date_joined" IS DISTINCT FROM (NEW."date_joined") OR OLD."email" IS DISTINCT FROM (NEW."email") OR OLD."formatted_name" IS DISTINCT FROM (NEW."formatted_name") OR OLD."id" IS DISTINCT FROM (NEW."id") OR OLD."is_active" IS DISTINCT FROM (NEW."is_active") OR OLD."is_superuser" IS DISTINCT FROM (NEW."is_superuser") OR OLD."is_system" IS DISTINCT FROM (NEW."is_system") OR OLD."name" IS DISTINCT FROM (NEW."name"))',
                    func='INSERT INTO "users_userevent" ("date_joined", "email", "id", "is_active", "is_superuser", "is_system", "name", "pgh_context_id", "pgh_created_at", "pgh_label", "pgh_obj_id") VALUES (NEW."date_joined", NEW."email", NEW."id", NEW."is_active", NEW."is_superuser", NEW."is_system", NEW."name", _pgh_attach_context(), NOW(), \'update\', NEW."id"); RETURN NULL;',
                    hash="39487a417c8f32533380e746f9afcd214cb572f1",
                    operation="UPDATE",
                    pgid="pgtrigger_update_update_16e22",
                    table="users_user",
                    when="AFTER",
                ),
            ),
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="user",
            trigger=pgtrigger.compiler.Trigger(
                name="delete_delete",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func='INSERT INTO "users_userevent" ("date_joined", "email", "id", "is_active", "is_superuser", "is_system", "name", "pgh_context_id", "pgh_created_at", "pgh_label", "pgh_obj_id") VALUES (OLD."date_joined", OLD."email", OLD."id", OLD."is_active", OLD."is_superuser", OLD."is_system", OLD."name", _pgh_attach_context(), NOW(), \'delete\', OLD."id"); RETURN NULL;',
                    hash="31eee98cc50fa359adc6bfa0c9edbf0aaf8dfd42",
                    operation="DELETE",
                    pgid="pgtrigger_delete_delete_56c96",
                    table="users_user",
                    when="AFTER",
                ),
            ),
        ),
        migrations.AddField(
            model_name="userevent",
            name="pgh_context",
            field=models.ForeignKey(
                db_constraint=False,
                null=True,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="+",
                to="pghistory.context",
            ),
        ),
        migrations.AddField(
            model_name="userevent",
            name="pgh_obj",
            field=models.ForeignKey(
                db_constraint=False,
                on_delete=django.db.models.deletion.DO_NOTHING,
                related_name="events",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="userevent",
            trigger=pgtrigger.compiler.Trigger(
                name="append_only",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func="RAISE EXCEPTION 'pgtrigger: Cannot update or delete rows from % table', TG_TABLE_NAME;",
                    hash="147f21ffd56e65f8363f55068815758ec34d2613",
                    operation="UPDATE OR DELETE",
                    pgid="pgtrigger_append_only_6b2f3",
                    table="users_userevent",
                    when="BEFORE",
                ),
            ),
        ),
    ]
