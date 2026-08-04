# Seeds GroupChange records for an added group and an associated permission.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("group_changed", "0001_initial"),
        ("vueda_user", "__latest__"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            INSERT INTO
                vueda_user_groupchange
                (
                    group_name,
                    group_name_old,
                    change_type,
                    "when",
                    historical_permission_codename,
                    historical_permission_content_type_app_label,
                    historical_permission_content_type_model_name
                )
            VALUES
                (
                    'GroupChangedWorkers',
                    '',
                    'added',
                    '2024-01-01 10:00:00+00:00',
                    'list_groupchangeduser',
                    'group_changed',
                    'groupchangeduser'
                ),
                (
                    'GroupChangedWorkers',
                    '',
                    'associated',
                    '2024-01-01 10:00:01+00:00',
                    'read_groupchangeduser',
                    'group_changed',
                    'groupchangeduser'
                ),
                (
                    'GroupChangedSeniorWorkers',
                    'GroupChangedWorkers',
                    'changed',
                    '2024-02-01 10:00:00+00:00',
                    'list_groupchangeduser',
                    'group_changed',
                    'groupchangeduser'
                );
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
