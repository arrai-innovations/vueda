"""The planner orders every tool's pending changes into steps, and names the apps that each step depends on."""

import datetime

from vueda.user.migration_generation.planner import PlannedMigration
from vueda.user.migration_generation.planner import PlannedStep
from vueda.user.migration_generation.planner import ToolChanges
from vueda.user.migration_generation.planner import plan_migrations
from vueda.user.migration_generation.tools import PendingChange


START = datetime.datetime(2026, 11, 13, 9, 0, tzinfo=datetime.UTC)
MINUTE = datetime.timedelta(minutes=1)


def test_no_pending_changes_plans_no_steps():
    plan = plan_migrations(
        (
            ToolChanges(tool_key="group", changes=()),
            ToolChanges(tool_key="workflow", changes=()),
        ),
        project_app_labels=("accounts", "store"),
    )

    assert plan == ()


def test_changes_of_one_tool_are_one_step_that_depends_on_every_project_app():
    added = PendingChange(recorded_at=START, tiebreak=(1,), app_label="accounts", data={"name": "added"})
    renamed = PendingChange(recorded_at=START + MINUTE, tiebreak=(2,), app_label="accounts", data={"name": "renamed"})

    plan = plan_migrations(
        (ToolChanges(tool_key="group", changes=(renamed, added), dependency_app_labels=("auth", "vueda_user")),),
        project_app_labels=("store", "accounts"),
    )

    assert plan == (
        PlannedStep(
            tool_key="group",
            migrations=(PlannedMigration(tool_key="group", app_label="accounts", changes=(added, renamed)),),
            dependency_app_labels=("accounts", "auth", "store", "vueda_user"),
        ),
    )


def test_interleaved_changes_become_one_step_per_switch_between_tools():
    """#727's sequence: create group A, grant it a state permission, rename it to B, grant B another one."""
    group_added = PendingChange(recorded_at=START, tiebreak=(1,), app_label="accounts", data={"name": "A"})
    permission_for_a = PendingChange(recorded_at=START + MINUTE, tiebreak=(10,), app_label="store", data={"group": "A"})
    group_renamed = PendingChange(
        recorded_at=START + 2 * MINUTE, tiebreak=(2,), app_label="accounts", data={"name": "B"}
    )
    permission_for_b = PendingChange(
        recorded_at=START + 3 * MINUTE, tiebreak=(11,), app_label="store", data={"group": "B"}
    )

    plan = plan_migrations(
        (
            ToolChanges(
                tool_key="group",
                changes=(group_added, group_renamed),
                dependency_app_labels=("auth", "vueda_user"),
            ),
            ToolChanges(
                tool_key="workflow",
                changes=(permission_for_a, permission_for_b),
                dependency_app_labels=("vueda_workflow",),
            ),
        ),
        project_app_labels=("accounts", "store"),
    )

    assert plan == (
        PlannedStep(
            tool_key="group",
            migrations=(PlannedMigration(tool_key="group", app_label="accounts", changes=(group_added,)),),
            dependency_app_labels=("accounts", "auth", "store", "vueda_user"),
        ),
        PlannedStep(
            tool_key="workflow",
            migrations=(PlannedMigration(tool_key="workflow", app_label="store", changes=(permission_for_a,)),),
            dependency_app_labels=("accounts", "vueda_workflow"),
        ),
        PlannedStep(
            tool_key="group",
            migrations=(PlannedMigration(tool_key="group", app_label="accounts", changes=(group_renamed,)),),
            dependency_app_labels=("auth", "store", "vueda_user"),
        ),
        PlannedStep(
            tool_key="workflow",
            migrations=(PlannedMigration(tool_key="workflow", app_label="store", changes=(permission_for_b,)),),
            dependency_app_labels=("accounts", "vueda_workflow"),
        ),
    )


def test_a_step_that_writes_several_apps_makes_the_next_step_depend_on_all_of_them():
    store_workflow = PendingChange(recorded_at=START, tiebreak=(1,), app_label="store", data={"workflow": "orders"})
    billing_workflow = PendingChange(
        recorded_at=START + MINUTE, tiebreak=(2,), app_label="billing", data={"workflow": "invoices"}
    )
    group_added = PendingChange(recorded_at=START + 2 * MINUTE, tiebreak=(1,), app_label="accounts", data={"name": "A"})

    plan = plan_migrations(
        (
            ToolChanges(tool_key="group", changes=(group_added,)),
            ToolChanges(tool_key="workflow", changes=(store_workflow, billing_workflow)),
        ),
        project_app_labels=("accounts", "billing", "store"),
    )

    assert plan[0] == PlannedStep(
        tool_key="workflow",
        migrations=(
            PlannedMigration(tool_key="workflow", app_label="store", changes=(store_workflow,)),
            PlannedMigration(tool_key="workflow", app_label="billing", changes=(billing_workflow,)),
        ),
        dependency_app_labels=("accounts", "billing", "store"),
    )
    assert plan[1].dependency_app_labels == ("billing", "store")


def test_changes_recorded_at_the_same_moment_follow_the_tool_order():
    """Groups come first on a tie, because a workflow change can name a group."""
    permission = PendingChange(recorded_at=START, tiebreak=(1,), app_label="store", data={"group": "A"})
    group_added = PendingChange(recorded_at=START, tiebreak=(99,), app_label="accounts", data={"name": "A"})

    plan = plan_migrations(
        (
            ToolChanges(tool_key="group", changes=(group_added,)),
            ToolChanges(tool_key="workflow", changes=(permission,)),
        ),
        project_app_labels=("accounts", "store"),
    )

    assert tuple(step.tool_key for step in plan) == ("group", "workflow")


def test_one_tools_changes_recorded_at_the_same_moment_follow_their_tiebreak():
    second = PendingChange(recorded_at=START, tiebreak=(2,), app_label="accounts", data={"name": "second"})
    first = PendingChange(recorded_at=START, tiebreak=(1,), app_label="accounts", data={"name": "first"})

    plan = plan_migrations(
        (ToolChanges(tool_key="group", changes=(second, first)),),
        project_app_labels=("accounts",),
    )

    assert plan[0].migrations[0].changes == (first, second)


def test_every_pending_change_is_planned_exactly_once():
    group_changes = tuple(
        PendingChange(recorded_at=START + minute * MINUTE, tiebreak=(minute,), app_label="accounts", data={"n": minute})
        for minute in (0, 1, 4, 5, 9)
    )
    workflow_changes = tuple(
        PendingChange(
            recorded_at=START + minute * MINUTE,
            tiebreak=(minute,),
            app_label="store" if minute % 2 else "billing",
            data={"n": minute},
        )
        for minute in (2, 3, 6, 7, 8)
    )

    plan = plan_migrations(
        (
            ToolChanges(tool_key="group", changes=group_changes),
            ToolChanges(tool_key="workflow", changes=workflow_changes),
        ),
        project_app_labels=("accounts", "billing", "store"),
    )

    planned = tuple(change for step in plan for migration in step.migrations for change in migration.changes)
    assert sorted(planned, key=lambda change: change.recorded_at) == sorted(
        (*group_changes, *workflow_changes), key=lambda change: change.recorded_at
    )
    assert len(planned) == len(group_changes) + len(workflow_changes)
    assert tuple(step.tool_key for step in plan) == ("group", "workflow", "group", "workflow", "group")
