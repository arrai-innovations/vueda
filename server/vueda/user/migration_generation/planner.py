"""Order the pending changes of every tool into the migrations that ``makevuedamigrations`` writes.

The plan is plain data. It reads no database and writes no files, so the writer can carry it out and a test can
check it on its own.
"""

__all__ = (
    "PlannedMigration",
    "PlannedStep",
    "ToolChanges",
    "plan_migrations",
)

import dataclasses


@dataclasses.dataclass(frozen=True)
class ToolChanges:
    """One tool's pending changes, with what the planner needs to know about the tool.

    ``dependency_app_labels`` names the apps that every migration of the tool depends on.
    """

    tool_key: str
    changes: tuple
    dependency_app_labels: tuple[str, ...] = ()


@dataclasses.dataclass(frozen=True)
class PlannedMigration:
    """One migration to write: the changes of one tool that one app's migration holds, in recorded order."""

    tool_key: str
    app_label: str
    changes: tuple


@dataclasses.dataclass(frozen=True)
class PlannedStep:
    """A run of consecutive changes from one tool to one app, written as one migration.

    Each migration of the step depends on the latest migration of each app in ``dependency_app_labels``. The
    writer reads those latest migrations just before it writes the step. The steps are written in order, so for
    every step after the first, those are the migrations that the step before it wrote.
    """

    tool_key: str
    migrations: tuple[PlannedMigration, ...]
    dependency_app_labels: tuple[str, ...]


def plan_migrations(tool_changes, project_app_labels):
    """Return the steps that write every pending change in the order that the changes were recorded.

    ``tool_changes`` is a sequence of ``ToolChanges``, in the order that breaks a tie between two tools. The
    changes are sorted by ``recorded_at``, then by that tool order, then by each change's own ``tiebreak``. A new
    step starts each time the sorted changes switch to another tool or another app. A change in one app can depend
    on a change in another, such as a workflow code that one app gives up and another app takes, so the steps
    keep that order too.

    The first step depends on every app in ``project_app_labels``. Each later step depends on the apps that the
    step before it wrote into. Every step also depends on its own tool's ``dependency_app_labels``.
    """
    tool_order = {}
    tool_dependencies = {}
    ordered = []
    for position, tool in enumerate(tool_changes):
        tool_order[tool.tool_key] = position
        tool_dependencies[tool.tool_key] = tuple(tool.dependency_app_labels)
        for change in tool.changes:
            ordered.append((tool.tool_key, change))

    ordered.sort(key=lambda item: (item[1].recorded_at, tool_order[item[0]], item[1].tiebreak))

    runs = []
    for tool_key, change in ordered:
        if runs and runs[-1][0] == tool_key and runs[-1][1][-1].app_label == change.app_label:
            runs[-1][1].append(change)
        else:
            runs.append((tool_key, [change]))

    steps = []
    previous_app_labels = tuple(project_app_labels)
    for tool_key, changes in runs:
        changes_by_app = {}
        for change in changes:
            if change.app_label not in changes_by_app:
                changes_by_app[change.app_label] = []
            changes_by_app[change.app_label].append(change)

        migrations = tuple(
            PlannedMigration(tool_key=tool_key, app_label=app_label, changes=tuple(app_changes))
            for app_label, app_changes in changes_by_app.items()
        )
        dependency_app_labels = tuple(sorted({*previous_app_labels, *tool_dependencies[tool_key]}))
        steps.append(PlannedStep(tool_key=tool_key, migrations=migrations, dependency_app_labels=dependency_app_labels))
        previous_app_labels = tuple(changes_by_app)

    return tuple(steps)
