"""Record several writes that look alike, so matching them one to one is worth testing.

The states here are added and removed repeatedly under the same codes, which produces events whose
tracked values are identical. Migration 0002 already captured the first add of each, so matching has
to pair each captured change with a different event and leave the rest to a new migration.

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
        # Three of them come back under the same codes, so their add events repeat values 0002
        # already carries a change for.
        migrations.RunSQL(
            sql=_add_states("delete_2", "delete_3", "delete_4"),
            reverse_sql=_delete_states("delete_2", "delete_3", "delete_4"),
        ),
        # Two of those go again, leaving one delete event per code that no migration has captured.
        migrations.RunSQL(
            sql=_delete_states("delete_3", "delete_4"),
            reverse_sql=_add_states("delete_3", "delete_4"),
        ),
    ]
