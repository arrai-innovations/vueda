# Seeds a GroupChange record for deleting an existing group and its last permission.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("group_deleted", "0001_initial"),
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
                    'GroupDeletedWorkers',
                    '',
                    'added',
                    '2024-01-01 10:00:00+00:00',
                    'list_groupdeleteduser',
                    'group_deleted',
                    'groupdeleteduser'
                ),
                (
                    'GroupDeletedWorkers',
                    '',
                    'associated',
                    '2024-01-01 10:00:01+00:00',
                    'read_groupdeleteduser',
                    'group_deleted',
                    'groupdeleteduser'
                ),
                (
                    'GroupDeletedWorkers',
                    '',
                    'unassociated',
                    '2024-03-01 10:00:02+00:00',
                    'read_groupdeleteduser',
                    'group_deleted',
                    'groupdeleteduser'
                ),
                (
                    'GroupDeletedWorkers',
                    '',
                    'deleted',
                    '2024-03-01 10:00:03+00:00',
                    'list_groupdeleteduser',
                    'group_deleted',
                    'groupdeleteduser'
                );
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
