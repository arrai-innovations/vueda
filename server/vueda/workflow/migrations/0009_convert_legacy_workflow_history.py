from django.db import migrations

from vueda.workflow.legacy_history import convert_legacy_workflow_history
from vueda.workflow.legacy_history import remove_converted_workflow_history


class Migration(migrations.Migration):
    dependencies = [
        ("pghistory", "0007_auto_20250421_0444"),
        ("vueda_workflow", "0008_initialstateevent_objectstateevent_stateevent_and_more"),
    ]

    operations = [
        migrations.RunPython(
            convert_legacy_workflow_history,
            remove_converted_workflow_history,
        ),
    ]
