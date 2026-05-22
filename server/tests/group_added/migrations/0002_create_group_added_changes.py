# Seeds GroupChange records for an added group and an associated permission.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("group_added", "0001_initial"),
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
                    'GroupAddedWorkers',
                    '',
                    'added',
                    '2024-01-01 10:00:00+00:00',
                    'list_groupaddeduser',
                    'group_added',
                    'groupaddeduser'
                ),
                (
                    'GroupAddedWorkers',
                    '',
                    'associated',
                    '2024-01-01 10:00:01+00:00',
                    'read_groupaddeduser',
                    'group_added',
                    'groupaddeduser'
                );
            """,
            reverse_sql="""
            DELETE FROM
                vueda_user_groupchange
            WHERE
                historical_permission_content_type_app_label = 'group_added';
            """,
        ),
    ]
