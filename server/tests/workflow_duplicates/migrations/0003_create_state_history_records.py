"""Remove several states at once, so matching many writes that look alike is worth testing.

Each delete records an event differing from the others only in the row it names, and none of them
is in a migration, so all four have to reach a new one without any of them matching another.

These are real writes rather than fabricated history rows. History is written by the triggers now,
so a row that was never written has no history to find.
"""

from django.db import migrations


WORKFLOW = """
    (
        SELECT
            id
        FROM
            vueda_workflow_workflow
        WHERE
            code = 'duplicates_workflow'
    )
"""


def _add_states(*codes):
    values = ",\n".join(f"('{code}', '{code}', {WORKFLOW})" for code in codes)
    return f"INSERT INTO vueda_workflow_state (name, code, workflow_id) VALUES {values};"


def _delete_states(*codes):
    listed = ", ".join(f"'{code}'" for code in codes)
    return f"DELETE FROM vueda_workflow_state WHERE code IN ({listed}) AND workflow_id = {WORKFLOW};"


class Migration(migrations.Migration):
    dependencies = [
        ("workflow_duplicates", "0002_workflow_migrations_2025_07_07"),
    ]

    operations = [
        # The four states 0002 added are removed, which 0002 did not capture.
        migrations.RunSQL(
            sql=_delete_states("delete_1", "delete_2", "delete_3", "delete_4"),
            reverse_sql=_add_states("delete_1", "delete_2", "delete_3", "delete_4"),
        ),
    ]
