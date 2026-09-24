"""Create the workflow the reused-code test starts from.

The test makes its own edits on top of this, so this migration only has to supply a workflow that a
state and a transition can be added to and removed from: two states, an initial state, and one
transition that already names a state as its target and another as its source.

Every write here goes through the workflow triggers without an action context, so history records it
the way it records a person's edit. The reverse of each statement is scoped to the workflow rather
than to the codes named here, so rolling this migration back also removes whatever the test added.
"""

from django.db import migrations


CONTENT_TYPE = """
    (
        SELECT id FROM django_content_type
        WHERE app_label = 'workflow_reused_codes' AND model = 'workflowreusedcodes'
    )
"""

WORKFLOW = "(SELECT id FROM vueda_workflow_workflow WHERE code = 'reused_codes_workflow')"

PERMISSION = f"""
    (
        SELECT id FROM auth_permission
        WHERE codename = 'update_workflowreusedcodes' AND content_type_id = {CONTENT_TYPE}
    )
"""

GROUP = "(SELECT id FROM auth_group WHERE name = 'ReusedCodesAdmin')"

STATES_OF_WORKFLOW = f"(SELECT id FROM vueda_workflow_state WHERE workflow_id = {WORKFLOW})"

TRANSITIONS_OF_WORKFLOW = f"(SELECT id FROM vueda_workflow_transition WHERE workflow_id = {WORKFLOW})"


def state(code):
    return f"(SELECT id FROM vueda_workflow_state WHERE code = '{code}' AND workflow_id = {WORKFLOW})"


def transition(code):
    return f"(SELECT id FROM vueda_workflow_transition WHERE code = '{code}' AND workflow_id = {WORKFLOW})"


class Migration(migrations.Migration):
    dependencies = [
        ("workflow_reused_codes", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_workflow
                    (name, code, content_type_id, historical_app_label, historical_model)
                VALUES
                    (
                        'Reused Codes Workflow',
                        'reused_codes_workflow',
                        {CONTENT_TYPE},
                        'workflow_reused_codes',
                        'workflowreusedcodes'
                    );
            """,
            reverse_sql="DELETE FROM vueda_workflow_workflow WHERE code = 'reused_codes_workflow';",
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_workflowpermission
                    (
                        workflow_id,
                        permission_id,
                        historical_permission_codename,
                        historical_permission_content_type_app_label,
                        historical_permission_content_type_model_name
                    )
                VALUES
                    (
                        {WORKFLOW},
                        {PERMISSION},
                        'update_workflowreusedcodes',
                        'workflow_reused_codes',
                        'workflowreusedcodes'
                    );
            """,
            reverse_sql=f"DELETE FROM vueda_workflow_workflowpermission WHERE workflow_id = {WORKFLOW};",
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_state
                    (name, code, workflow_id)
                VALUES
                    ('State 1', 'state_1', {WORKFLOW}),
                    ('State 2', 'state_2', {WORKFLOW});
            """,
            reverse_sql=f"DELETE FROM vueda_workflow_state WHERE workflow_id = {WORKFLOW};",
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_initialstate
                    (workflow_id, state_id)
                VALUES
                    ({WORKFLOW}, {state("state_1")});
            """,
            reverse_sql=f"DELETE FROM vueda_workflow_initialstate WHERE workflow_id = {WORKFLOW};",
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_statepermission
                    (
                        state_id,
                        permission_id,
                        historical_permission_codename,
                        historical_permission_content_type_app_label,
                        historical_permission_content_type_model_name,
                        group_id,
                        historical_group_name,
                        grant_or_deny
                    )
                VALUES
                    (
                        {state("state_1")},
                        {PERMISSION},
                        'update_workflowreusedcodes',
                        'workflow_reused_codes',
                        'workflowreusedcodes',
                        {GROUP},
                        'ReusedCodesAdmin',
                        TRUE
                    );
            """,
            reverse_sql=f"DELETE FROM vueda_workflow_statepermission WHERE state_id IN {STATES_OF_WORKFLOW};",
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_transition
                    (name, code, workflow_id, target_id)
                VALUES
                    ('Go To State 1', 'go_to_state_1', {WORKFLOW}, {state("state_1")});
            """,
            reverse_sql=f"DELETE FROM vueda_workflow_transition WHERE workflow_id = {WORKFLOW};",
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_transitionpermission
                    (
                        transition_id,
                        permission_id,
                        historical_permission_codename,
                        historical_permission_content_type_app_label,
                        historical_permission_content_type_model_name
                    )
                VALUES
                    (
                        {transition("go_to_state_1")},
                        {PERMISSION},
                        'update_workflowreusedcodes',
                        'workflow_reused_codes',
                        'workflowreusedcodes'
                    );
            """,
            reverse_sql=(
                f"DELETE FROM vueda_workflow_transitionpermission WHERE transition_id IN {TRANSITIONS_OF_WORKFLOW};"
            ),
        ),
        migrations.RunSQL(
            sql=f"""
                INSERT INTO vueda_workflow_transitionsource
                    (transition_id, source_id, ignored)
                VALUES
                    ({transition("go_to_state_1")}, {state("state_2")}, FALSE);
            """,
            reverse_sql=f"""
                DELETE FROM vueda_workflow_transitionsource
                WHERE transition_id IN {TRANSITIONS_OF_WORKFLOW} OR source_id IN {STATES_OF_WORKFLOW};
            """,
        ),
    ]
