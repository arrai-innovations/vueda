"""updatevuedamigrations refreshes the generated migrations that earlier versions of VUEDA wrote.

The tests that only rewrite text need no database. The import rewrites run on source text, because Django imports
every migration when it builds the migration graph, and an import of a removed module would stop that.
"""

import ast
import io
import os
import re
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest
from django.core.management import call_command

import vueda
from tests.utils import BaseTestMigrations
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.migration_generation import dependencies
from vueda.user.migration_generation import group_operations
from vueda.user.migration_generation.groups import GROUP_MIGRATION_KIND
from vueda.user.migration_generation.refresh import OBSOLETE_GROUP_NAMES
from vueda.user.migration_generation.refresh import OBSOLETE_WORKFLOW_NAMES
from vueda.user.migration_generation.refresh import refresh_migration
from vueda.user.migration_generation.refresh import remove_obsolete_names
from vueda.user.migration_generation.refresh import rewrite_removed_imports
from vueda.workflow.migration_generation.refresh import changed_data_updater
from vueda.workflow.migration_generation.refresh import collect_workflow_identities
from vueda.workflow.migration_generation.refresh import read_changed_data
from vueda.workflow.migration_generation.tool import WORKFLOW_MIGRATION_KIND


# Frozen copies of migrations that earlier versions generated. They are text, so nothing imports them by accident.
OLD_MIGRATIONS = Path(__file__).parent / "old_migrations"


def test_a_group_import_of_the_removed_module_points_at_the_current_one():
    source = textwrap.dedent(
        """\
        import datetime

        from django.db import migrations

        from vueda.user.management.commands.makegroupmigrations import backwards_migrate_groups
        from vueda.user.management.commands.makegroupmigrations import forwards_migrate_groups
        from vueda.user.management.commands.makegroupmigrations import make_sure_permissions_exist
        """
    )

    result = rewrite_removed_imports(source)

    assert result.changed
    assert result.dropped == ()
    assert result.source == textwrap.dedent(
        """\
        import datetime

        from django.db import migrations

        from vueda.user.migration_generation.group_operations import backwards_migrate_groups
        from vueda.user.migration_generation.group_operations import forwards_migrate_groups
        from vueda.user.migration_generation.group_operations import make_sure_permissions_exist
        """
    )


def test_a_workflow_name_that_no_longer_exists_is_dropped_and_reported():
    """Older migrations imported helpers too. add_history_to_data no longer exists anywhere."""
    source = textwrap.dedent(
        """\
        from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data
        from vueda.workflow.management.commands.makeworkflowmigrations import handle_state
        from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow as forwards
        """
    )

    result = rewrite_removed_imports(source)

    assert result.dropped == ("vueda.workflow.management.commands.makeworkflowmigrations.add_history_to_data",)
    assert result.source == textwrap.dedent(
        """\
        from vueda.workflow.migration_generation.operations import handle_state
        from vueda.workflow.migration_generation.operations import forwards_migrate_workflow as forwards
        """
    )


def test_the_aliased_module_import_imports_the_current_module_under_the_same_alias():
    """A short-lived form imported the whole module and set its changed_data through the alias."""
    source = textwrap.dedent(
        """\
        import vueda.user.management.commands.makegroupmigrations as _makegroupmigrations

        changed_data = []
        _makegroupmigrations.changed_data = changed_data
        """
    )

    result = rewrite_removed_imports(source)

    assert result.changed
    assert result.source.splitlines()[0] == (
        "import vueda.user.migration_generation.group_operations as _makegroupmigrations"
    )
    assert "_makegroupmigrations.changed_data = changed_data" in result.source


def test_a_mention_outside_an_import_statement_is_left_alone():
    source = textwrap.dedent(
        '''\
        # Made by vueda.workflow.management.commands.makeworkflowmigrations.
        NOTE = "vueda.user.management.commands.makegroupmigrations"


        def describe():
            """Written by vueda.user.management.commands.makegroupmigrations."""
            from vueda.user.management.commands.makegroupmigrations import migrate_step  # noqa: F401
        '''
    )

    result = rewrite_removed_imports(source)

    assert not result.changed
    assert result.source == source


def test_a_migration_without_removed_imports_is_unchanged():
    source = "from django.db import migrations\n\nfrom vueda.core.audit import audited_action\n"

    result = rewrite_removed_imports(source)

    assert not result.changed
    assert result.dropped == ()
    assert result.source == source


def test_the_rewritten_imports_import():
    source = textwrap.dedent(
        """\
        from vueda.user.management.commands.makegroupmigrations import GroupChangeTypes
        from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data
        from vueda.workflow.management.commands.makeworkflowmigrations import manage_state_objects
        import vueda.user.management.commands.makegroupmigrations as _makegroupmigrations
        """
    )

    namespace = {}
    exec(compile(rewrite_removed_imports(source).source, "<migration>", "exec"), namespace)

    assert {"GroupChangeTypes", "manage_state_objects", "_makegroupmigrations"} <= namespace.keys()


def test_obsolete_functions_and_imports_that_nothing_uses_are_removed():
    source = textwrap.dedent(
        """\
        from django.db import migrations


        def add_history_to_data(data):
            return data


        def forwards_migrate_workflow(apps, changed_items, change_reason):
            pass


        class Migration(migrations.Migration):
            operations = []
        """
    )

    result, removed = remove_obsolete_names(source, OBSOLETE_WORKFLOW_NAMES)

    assert removed == ("add_history_to_data",)
    assert result == textwrap.dedent(
        """\
        from django.db import migrations


        def forwards_migrate_workflow(apps, changed_items, change_reason):
            pass


        class Migration(migrations.Migration):
            operations = []
        """
    )


def test_an_obsolete_name_that_other_code_still_uses_is_kept():
    """A developer's own code may still call it, so only the unused ones go."""
    source = textwrap.dedent(
        """\
        from django.conf import settings


        def add_history_to_data(data):
            return data


        def my_own_step(apps, schema_editor):
            return add_history_to_data(settings.AUTH_USER_MODEL)
        """
    )

    assert remove_obsolete_names(source, OBSOLETE_WORKFLOW_NAMES | OBSOLETE_GROUP_NAMES) == (source, ())


def test_removing_obsolete_names_twice_changes_nothing_the_second_time():
    source = "from django.conf import settings\n\nfrom django.db import migrations\n"

    once, removed = remove_obsolete_names(source, OBSOLETE_GROUP_NAMES)

    assert removed == ("settings",)
    assert remove_obsolete_names(once, OBSOLETE_GROUP_NAMES) == (once, ())


@pytest.mark.parametrize(
    ("fixture", "kind", "entry_point", "removed_names"),
    [
        ("group_copied_2026_06.py.txt", GROUP_MIGRATION_KIND, "def forwards_migrate_groups(apps, changed_items):", ()),
        (
            "workflow_copied_2026_06.py.txt",
            WORKFLOW_MIGRATION_KIND,
            "def forwards_migrate_workflow(apps, changed_items, change_reason):",
            ("add_history_to_data",),
        ),
        (
            "workflow_imported_2026_07.py.txt",
            WORKFLOW_MIGRATION_KIND,
            "from vueda.workflow.migration_generation.operations import forwards_migrate_workflow",
            (),
        ),
        (
            "workflow_imported_old_module_2026_07.py.txt",
            WORKFLOW_MIGRATION_KIND,
            "from vueda.workflow.migration_generation.operations import forwards_migrate_workflow",
            (),
        ),
    ],
)
def test_an_old_migration_is_refreshed_and_a_second_refresh_changes_nothing(fixture, kind, entry_point, removed_names):
    source = (OLD_MIGRATIONS / fixture).read_text()

    once = refresh_migration(source, kind)

    assert once.changed
    assert once.removed_names == removed_names
    assert entry_point in once.source
    assert "--import-instead" not in once.source
    assert "VUEDA's own tests" not in once.source
    assert ".management.commands.make" not in once.source
    compile(once.source, fixture, "exec")
    # Every top-level definition keeps a blank line before it, and the refresh adds no runs of blank lines.
    assert re.search(r"[^\n]\n(def|class) ", once.source) is None
    assert "\n\n\n\n" not in once.source
    second = refresh_migration(once.source, kind)
    assert not second.changed
    assert second.source == once.source


def test_a_workflow_reference_gains_its_app_and_model_and_a_second_refresh_changes_nothing():
    """References in older workflow migrations name a workflow by code alone. The refresh adds the app and model
    that the workflow's own change recorded."""
    source = (OLD_MIGRATIONS / "workflow_copied_2026_06.py.txt").read_text()
    changed_data, problem = read_changed_data(source, "workflow_copied_2026_06.py")
    assert problem is None
    update = changed_data_updater(
        collect_workflow_identities([changed_data]), "workflow_copied_2026_06.py", stderr=io.StringIO(), dry_run=True
    )

    once = refresh_migration(source, WORKFLOW_MIGRATION_KIND, update_changed_data=update)

    assert once.source.count("historical_app_label") > source.count("historical_app_label")
    assert not refresh_migration(once.source, WORKFLOW_MIGRATION_KIND, update_changed_data=update).changed


def test_changed_data_that_cannot_be_read_is_reported_with_the_reason():
    source = 'history_change_reason = "Workflow Migration - x"\nchanged_data = [{"model_name": "state"}]\n'

    assert read_changed_data(source, "broken.py") == (None, "change 0 has no 'history_date', 'changes'")


def test_a_function_inserted_before_an_existing_one_keeps_two_blank_lines_on_each_side():
    """A new function that comes first in the copied sources is inserted before the first one that the file has."""
    source = "import copy\n\n\ndef existing():\n    return 1\n\n\nclass Migration:\n    pass\n"
    sources = {
        ("added",): "def added():\n    return 2\n",
        ("existing",): "def existing():\n    return 1\n",
    }

    merged = merge_migration_sources(source, sources)

    assert merged == (
        "import copy\n\n\n"
        "def added():\n    return 2\n\n\n"
        "def existing():\n    return 1\n\n\n"
        "class Migration:\n    pass\n"
    )


@pytest.mark.parametrize(
    ("fixture", "kind"),
    [
        ("group_copied_2026_06.py.txt", GROUP_MIGRATION_KIND),
        ("workflow_copied_2026_06.py.txt", WORKFLOW_MIGRATION_KIND),
        ("workflow_imported_old_module_2026_07.py.txt", WORKFLOW_MIGRATION_KIND),
    ],
)
def test_a_refreshed_migration_passes_the_projects_ruff_check_and_format_unchanged(fixture, kind):
    """A linter that changed a refreshed migration would make the next refresh write it again.

    VUEDA's own pre-commit hook runs ruff on committed migrations, so the refreshed text must be what ruff leaves:
    no unused imports, no unused suppressions, and ruff's formatting.
    """
    source = refresh_migration((OLD_MIGRATIONS / fixture).read_text(), kind).source
    as_if_in = "tests/erring/migrations/0099_refreshed.py"

    for args in (("check",), ("format", "--check")):
        result = subprocess.run(
            [sys.executable, "-m", "ruff", *args, "--stdin-filename", as_if_in, "-"],
            input=source,
            capture_output=True,
            text=True,
            check=False,
            cwd=Path(__file__).parents[3],
        )
        assert result.returncode == 0, result.stdout + result.stderr


# The latest migrations of the apps that the old migrations below are made to depend on.
WORKFLOW_SCHEMA = ("vueda_workflow", "0009_remove_historicalobjectstate_history_relation_and_more")
# A vueda_workflow migration from before the event tables that the current workflow functions read.
WORKFLOW_SCHEMA_BEFORE_EVENTS = (
    "vueda_workflow",
    "0006_rename_fail_with_silent_historicaltransitionsource_ignored_and_more",
)
USER_SCHEMA = ("vueda_user", "0007_groupchange_when_database_clock")


def write_old_migration(directory, name, fixture, migration_dependencies):
    """Write the frozen migration ``fixture`` into ``directory`` as ``name``, with ``migration_dependencies``.

    The frozen migrations depend on the apps of the projects that they came from, so their dependency list is
    replaced, found with ast so nothing else in the file changes.
    """
    source = (OLD_MIGRATIONS / fixture).read_text()
    migration_class = next(
        node for node in ast.parse(source).body if isinstance(node, ast.ClassDef) and node.name == "Migration"
    )
    assignment = next(
        node
        for node in migration_class.body
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "dependencies"
    )
    lines = source.splitlines(keepends=True)
    lines[assignment.lineno - 1 : assignment.end_lineno] = [
        "    dependencies = [\n",
        *(f'        ("{app_label}", "{migration}"),\n' for app_label, migration in migration_dependencies),
        "    ]\n",
    ]
    path = Path(directory) / f"{name}.py"
    path.write_text("".join(lines))
    return path


def run_update(*args):
    """Run updatevuedamigrations, and return its output, its error output, and its exit status."""
    stdout, stderr = io.StringIO(), io.StringIO()
    try:
        call_command("updatevuedamigrations", *args, stdout=stdout, stderr=stderr)
    except SystemExit as exit_:
        return stdout.getvalue(), stderr.getvalue(), exit_.code
    return stdout.getvalue(), stderr.getvalue(), 0


class TestUpdateVuedaMigrations(BaseTestMigrations):
    """The command on whole files. No test touches the database: the command reads and writes migration files, and
    it builds the migration graph without a connection."""

    @pytest.fixture(autouse=True)
    def source_tree_installed_as_a_package(self, monkeypatch):
        """Mark this repository's source tree as installed, so only the temporary migration modules are written.

        The command covers every app. In a project, VUEDA is an installed package, so the command reads its
        migrations and never rewrites them. Here every committed migration must stay as it is, so the whole source
        tree counts as installed. The temporary migration modules live outside it.
        """
        source_tree = os.path.normcase(os.path.realpath(Path(vueda.__file__).parent.parent))
        monkeypatch.setattr(
            dependencies, "INSTALLED_PACKAGE_PATHS", (*dependencies.INSTALLED_PACKAGE_PATHS, source_tree)
        )

    def test_an_old_workflow_migration_is_refreshed_and_then_up_to_date(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            assert "  Removed add_history_to_data, which VUEDA no longer writes and nothing uses." in out
            assert "Updated 1 workflow migration(s)." in out
            after = path.read_text()
            assert after != before
            assert "def add_history_to_data" not in after
            assert "forwards_migrate_workflow_through_imports" in after

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Already up to date: {path}" in out
            assert "Updated" not in out
            assert path.read_text() == after

    def test_an_old_group_migration_is_refreshed(self, settings):
        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            path = write_old_migration(
                employee_dir,
                "0002_group_permission_migrations_2026_06_29",
                "group_copied_2026_06.py.txt",
                (("employee", "0001_initial"), USER_SCHEMA),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            assert "Updated 1 group migration(s)." in out
            source = path.read_text()
            assert "forwards_migrate_groups_through_imports," in source
            assert "def forwards_migrate_groups(apps, changed_items):" in source

    def test_a_dry_run_reports_without_writing(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()

            out, err, status = run_update("--dry-run")

            assert (status, err) == (0, "")
            assert f"Would update: {path}" in out
            assert "Would update 1 workflow migration(s)." in out
            assert path.read_text() == before

    def test_imports_of_a_removed_module_are_fixed_before_the_graph_is_built(self, settings):
        """Django imports every migration to build the graph, so one importing a removed module would stop it."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_07_01",
                "workflow_imported_old_module_2026_07.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            source = path.read_text()
            assert "management.commands.makeworkflowmigrations" not in source
            assert "from vueda.workflow.migration_generation.operations import forwards_migrate_workflow" in source

    def test_a_dry_run_with_imports_of_a_removed_module_skips_only_the_dependency_check(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_07_01",
                "workflow_imported_old_module_2026_07.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()

            out, err, status = run_update("--dry-run")

            assert (status, err) == (0, "")
            assert f"Would update: {path}" in out
            assert "the dependency check is skipped in a dry run" in out
            assert path.read_text() == before

    def test_a_workflow_migration_that_runs_before_the_workflow_events_is_left_unchanged(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (
                    ("erring", "0001_initial"),
                    ("vueda_workflow", "0006_rename_fail_with_silent_historicaltransitionsource_ignored_and_more"),
                ),
            )
            before = path.read_text()

            out, err, status = run_update()

            assert status == 1
            assert f"Cannot update {path}: its dependencies do not include vueda_workflow.0008_" in err
            assert "Failed updating 1 migration(s)." in out
            assert path.read_text() == before

    def test_a_migration_that_is_not_valid_python_fails_and_the_others_are_still_refreshed(self, settings):
        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            refreshed = write_old_migration(
                employee_dir,
                "0002_group_permission_migrations_2026_06_29",
                "group_copied_2026_06.py.txt",
                (("employee", "0001_initial"), USER_SCHEMA),
            )
            broken = Path(employee_dir) / "0003_group_permission_migrations_2026_06_30.py"
            broken.write_text(
                "# Generated by Django 6.1 on 2026-06-30 00:00\n"
                + group_operations.LEGACY_MIGRATION_MODIFIED_COMMENT
                + "changed_data = [\n"
            )

            out, err, status = run_update()

            assert status == 1
            assert f"Could not update {broken}: The migration is not valid Python" in err
            assert f"Updating: {refreshed}" in out
            assert "Failed updating 1 migration(s)." in out

    def test_an_app_installed_as_a_package_is_never_rewritten(self, settings, monkeypatch):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()
            monkeypatch.setattr(
                dependencies,
                "INSTALLED_PACKAGE_PATHS",
                (*dependencies.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, _err, _status = run_update()

            assert str(path) not in out
            assert path.read_text() == before
