"""updatevuedamigrations refreshes the generated migrations that earlier versions of VUEDA wrote.

The tests that only rewrite text need no database. The import rewrites run on source text, because Django imports
every migration when it builds the migration graph, and an import of a removed module would stop that.
"""

import ast
import io
import os
import re
import stat
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest
from django.core.management import call_command
from django.db.migrations.exceptions import CircularDependencyError
from django.db.migrations.exceptions import NodeNotFoundError

import vueda
from tests.utils import BaseTestMigrations
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.migration_generation import dependencies
from vueda.user.migration_generation import group_operations
from vueda.user.migration_generation.groups import GROUP_MIGRATION_KIND
from vueda.user.migration_generation.refresh import RefreshError
from vueda.user.migration_generation.refresh import refresh_migration
from vueda.user.migration_generation.refresh import remove_obsolete_names
from vueda.user.migration_generation.refresh import rewrite_removed_imports
from vueda.workflow.migration_generation import operations as workflow_operations
from vueda.workflow.migration_generation import refresh as workflow_refresh
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

    result, removed = remove_obsolete_names(source, WORKFLOW_MIGRATION_KIND.obsolete_names)

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


def test_an_obsolete_import_alone_in_the_last_import_group_keeps_two_blank_lines_before_the_code():
    """ruff's isort rules, as this project sets them, want two blank lines after the imports."""
    source = textwrap.dedent(
        """\
        import datetime

        from django.utils import timezone


        changed_data = []
        """
    )

    result, removed = remove_obsolete_names(source, WORKFLOW_MIGRATION_KIND.obsolete_names)

    assert removed == ("timezone",)
    assert result == "import datetime\n\n\nchanged_data = []\n"


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        pytest.param(
            "import datetime\n\nfrom django.utils import timezone\nfrom django.db import migrations\n",
            "import datetime\n\nfrom django.db import migrations\n",
            id="opens-a-group",
        ),
        pytest.param(
            "from django.utils import timezone\n\nimport datetime\n",
            "import datetime\n",
            id="first-line",
        ),
    ],
)
def test_an_obsolete_import_keeps_the_gaps_between_import_groups(source, expected):
    assert remove_obsolete_names(source, WORKFLOW_MIGRATION_KIND.obsolete_names) == (expected, ("timezone",))


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

    obsolete = WORKFLOW_MIGRATION_KIND.obsolete_names | GROUP_MIGRATION_KIND.obsolete_names
    assert remove_obsolete_names(source, obsolete) == (source, ())


def test_an_obsolete_name_that_a_kept_one_uses_is_kept_too():
    """add_history_to_data stays because the developer's step calls it, so the timezone that it uses stays too."""
    source = textwrap.dedent(
        """\
        from django.utils import timezone


        def add_history_to_data(data):
            return timezone.now()


        def my_own_step(apps, schema_editor):
            return add_history_to_data({})
        """
    )

    assert remove_obsolete_names(source, WORKFLOW_MIGRATION_KIND.obsolete_names) == (source, ())


def test_a_dropped_import_that_the_migration_still_uses_is_refused():
    source = (OLD_MIGRATIONS / "workflow_imported_old_module_2026_07.py.txt").read_text()
    source = source.replace(
        "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
        "from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data\n"
        "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
    )
    source += "\n\ndef my_own_step(apps, schema_editor):\n    return add_history_to_data({})\n"

    with pytest.raises(RefreshError, match=r"The migration still uses add_history_to_data, which VUEDA no longer has"):
        refresh_migration(source, WORKFLOW_MIGRATION_KIND)


def test_a_path_with_a_site_packages_part_counts_as_installed(monkeypatch):
    """A package installed with pip install --target, or kept on PYTHONPATH, is outside this interpreter's own
    package directories."""
    monkeypatch.setattr(dependencies, "get_migrations_path", lambda app_config: "/srv/deps/site-packages/x/migrations")

    assert dependencies.is_installed_package_app("erring")


def test_a_removed_module_imported_without_an_alias_is_refused():
    """Its uses name the module by its full dotted path, which no import can point at the current module."""
    source = (
        "import vueda.user.management.commands.makegroupmigrations\n\n"
        "changed_data = []\n"
        "step = vueda.user.management.commands.makegroupmigrations.forwards_migrate_groups\n"
    )

    with pytest.raises(RefreshError, match="without an alias"):
        refresh_migration(source, GROUP_MIGRATION_KIND)


def test_a_module_alias_use_that_only_a_replaced_copy_had_is_not_refused():
    """The checks read the refreshed text, so the old copy that the refresh replaced no longer counts."""
    source = (OLD_MIGRATIONS / "workflow_imported_old_module_2026_07.py.txt").read_text()
    source = source.replace(
        "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
        "import vueda.workflow.management.commands.makeworkflowmigrations as _old\n"
        "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
    ).replace(
        "    forwards_migrate_workflow(apps, copy.deepcopy(changed_data), history_change_reason)\n",
        "    _old.add_history_to_data(changed_data)\n"
        "    forwards_migrate_workflow(apps, copy.deepcopy(changed_data), history_change_reason)\n",
    )

    result = refresh_migration(source, WORKFLOW_MIGRATION_KIND)

    assert "add_history_to_data" not in result.source


def test_a_name_that_the_current_module_lacks_used_through_a_module_alias_is_refused():
    source = (
        "import vueda.workflow.management.commands.makeworkflowmigrations as _old\n\n"
        'history_change_reason = "Workflow Migration - x"\n'
        "changed_data = []\n"
        "step = _old.add_history_to_data\n"
    )

    with pytest.raises(RefreshError, match=r"uses _old\.add_history_to_data, which VUEDA no longer has"):
        refresh_migration(source, WORKFLOW_MIGRATION_KIND)


def test_an_import_group_that_loses_every_line_leaves_no_extra_blank_lines():
    source = (
        "from django.db import migrations\n\n"
        "from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data\n\n\n"
        "changed_data = []\n"
    )

    assert rewrite_removed_imports(source).source == "from django.db import migrations\n\n\nchanged_data = []\n"


def test_a_local_variable_named_changed_data_does_not_stop_the_identity_update():
    source = (OLD_MIGRATIONS / "workflow_copied_2026_06.py.txt").read_text()
    source += "\n\ndef my_own_step(apps, schema_editor):\n    changed_data = []\n    return changed_data\n"
    changed_data, _problem = read_changed_data(source, "workflow_copied_2026_06.py")
    update = changed_data_updater(
        collect_workflow_identities([changed_data]), "workflow_copied_2026_06.py", stderr=io.StringIO(), dry_run=True
    )

    assert refresh_migration(source, WORKFLOW_MIGRATION_KIND, update_changed_data=update).changed


def test_removing_obsolete_names_twice_changes_nothing_the_second_time():
    source = "from django.conf import settings\n\nfrom django.db import migrations\n"

    once, removed = remove_obsolete_names(source, GROUP_MIGRATION_KIND.obsolete_names)

    assert removed == ("settings",)
    assert remove_obsolete_names(once, GROUP_MIGRATION_KIND.obsolete_names) == (once, ())


@pytest.mark.parametrize(
    ("changed_data_source", "problem"),
    [
        ("changed_data = {}", "changed_data is a dict, not a list"),
        ("changed_data = [1]", "change 0 is a int, not a dict"),
        (
            "changed_data = [{'model_name': 'state', 'history_date': '2026-06-29', 'changes': {}}]",
            "change 0 has a history_date that is not a datetime",
        ),
        (
            "import datetime\n"
            "changed_data = [{'model_name': 'state', 'history_date': datetime.datetime(2026, 6, 29), 'changes': []}]",
            "change 0 has changes that are not a dict",
        ),
        ("raise RuntimeError('the migration fails to import')", "the migration fails to import"),
    ],
)
def test_changed_data_that_a_refresh_cannot_read_names_the_reason(changed_data_source, problem):
    assert read_changed_data(changed_data_source, "unreadable.py") == (None, problem)


def test_a_workflow_migration_without_its_history_change_reason_is_refused():
    with pytest.raises(RefreshError, match=r"Could not find history_change_reason in the migration\."):
        refresh_migration("changed_data = []\n", WORKFLOW_MIGRATION_KIND)


@pytest.mark.parametrize(
    ("fixture", "kind", "entry_point", "removed_names"),
    [
        ("group_copied_2026_06.py.txt", GROUP_MIGRATION_KIND, "def forwards_migrate_groups(apps, changed_items):", ()),
        (
            "group_copied_direct_runpython_2026_06.py.txt",
            GROUP_MIGRATION_KIND,
            "code=forwards_migrate_groups_through_imports,",
            (),
        ),
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
        ("group_copied_direct_runpython_2026_06.py.txt", GROUP_MIGRATION_KIND),
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


def write_workflow_migration(directory, name, changed_data_source):
    """Write a small generated workflow migration into ``directory`` whose changed_data is ``changed_data_source``."""
    path = Path(directory) / f"{name}.py"
    path.write_text(
        "# Generated by Django 6.1 on 2026-06-29 00:00\n"
        + workflow_operations.LEGACY_MIGRATION_MODIFIED_COMMENT
        + "import datetime\n\n"
        + "from django.db import migrations\n\n\n"
        + f'history_change_reason = "Workflow Migration - {name}"\n'
        + 'migration_app_label = "erring"\n'
        + f"changed_data = {changed_data_source}\n\n\n"
        + "class Migration(migrations.Migration):\n"
        + "    dependencies = [\n"
        + '        ("erring", "0002_workflow_migrations_2026_03_24"),\n'
        + f'        ("{WORKFLOW_SCHEMA[0]}", "{WORKFLOW_SCHEMA[1]}"),\n'
        + "    ]\n\n"
        + "    operations = []\n"
    )
    return path


# A state added to the erring workflow, with the change's history_date given separately.
STATE_ADDED = (
    "[{{'changes': {{'code': 'held', 'name': 'Held', 'id': {{'code': 'held', 'workflow_id': {{'code': "
    "'enabledwithworkflow'}}}}, 'workflow_id': {{'code': 'enabledwithworkflow'}}}}, 'history_date': {history_date}, "
    "'history_type': 'added', 'model_name': 'state'}}]"
)


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
            # Older --import-instead migrations imported helpers too, one of which no longer exists.
            path.write_text(
                path.read_text().replace(
                    "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
                    "from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data\n"
                    "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
                )
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            assert (
                "  Dropped the import of "
                "vueda.workflow.management.commands.makeworkflowmigrations.add_history_to_data, "
                "which VUEDA no longer has."
            ) in out
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

    @pytest.mark.parametrize("dry_run", [False, True])
    def test_a_group_migration_that_imports_the_removed_module_does_not_stop_the_run(self, settings, dry_run):
        """An early --import-instead group migration imported the removed module both ways. Importing it as it is
        raises ModuleNotFoundError, which would stop anything that builds the migration graph."""
        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            path = Path(employee_dir) / "0002_group_permission_migrations_2026_06_15.py"
            path.write_text(
                "# Generated by Django 5.2 on 2026-06-15 00:00\n"
                + group_operations.LEGACY_MIGRATION_MODIFIED_COMMENT
                + textwrap.dedent(
                    """\
                    import copy
                    import datetime

                    from django.db import migrations

                    import vueda.user.management.commands.makegroupmigrations as _makegroupmigrations
                    from vueda.user.management.commands.makegroupmigrations import backwards_migrate_groups
                    from vueda.user.management.commands.makegroupmigrations import forwards_migrate_groups
                    from vueda.user.management.commands.makegroupmigrations import make_sure_permissions_exist


                    changed_data = []
                    _makegroupmigrations.changed_data = changed_data


                    class Migration(migrations.Migration):
                        dependencies = [
                            ("employee", "0001_initial"),
                            ("vueda_user", "0007_groupchange_when_database_clock"),
                        ]

                        operations = [
                            migrations.RunPython(
                                code=make_sure_permissions_exist,
                                reverse_code=migrations.RunPython.noop,
                            ),
                            migrations.RunPython(
                                code=forwards_migrate_groups,
                                reverse_code=backwards_migrate_groups,
                            ),
                        ]
                    """
                )
            )
            before = path.read_text()

            out, err, status = run_update(*(("--dry-run",) if dry_run else ()))

            assert (status, err) == (0, "")
            assert f"{'Would update' if dry_run else 'Updating'}: {path}" in out
            if dry_run:
                assert path.read_text() == before
            else:
                source = path.read_text()
                assert "management.commands.makegroupmigrations" not in source
                assert "forwards_migrate_groups_through_imports" in source
                compile(source, str(path), "exec")

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

    def test_a_migration_graph_that_cannot_be_built_is_reported_and_nothing_is_rewritten(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "missing_migration"), WORKFLOW_SCHEMA),
            )
            originals = {item: item.read_bytes() for item in Path(erring_dir).glob("*.py")}

            out, err, status = run_update()

            assert status == 1
            assert f"Cannot update {path}: cannot resolve migration dependencies" in err
            assert "missing_migration" in err
            assert "Traceback" not in err
            assert {item: item.read_bytes() for item in originals} == originals
            assert "Updating:" not in out

    def test_a_dry_run_reports_a_migration_graph_that_cannot_be_built(self, settings):
        """Only old imports let a dry run skip the dependency check. A missing dependency fails it too."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "missing_migration"), WORKFLOW_SCHEMA),
            )

            out, err, status = run_update("--dry-run")

            assert status == 1
            assert f"Cannot update {path}: cannot resolve migration dependencies" in err
            assert "Would update:" not in out

    def test_a_reference_takes_the_app_and_model_of_a_workflow_that_only_a_package_records(self, settings):
        """queueitem's workflow is recorded only in vueda_vdq's migrations, which these tests treat as a package."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = Path(erring_dir) / "0003_workflow_migrations_2026_06_29.py"
            path.write_text(
                "# Generated by Django 6.1 on 2026-06-29 00:00\n"
                + workflow_operations.LEGACY_MIGRATION_MODIFIED_COMMENT
                + textwrap.dedent(
                    """\
                    import datetime

                    from django.db import migrations


                    history_change_reason = "Workflow Migration - 0003_workflow_migrations_2026_06_29"
                    migration_app_label = "erring"
                    changed_data = [
                        {
                            "changes": {
                                "code": "on_hold",
                                "id": {"code": "on_hold", "workflow_id": {"code": "queueitem"}},
                                "name": "On Hold",
                                "workflow_id": {"code": "queueitem"},
                            },
                            "history_date": datetime.datetime(2026, 6, 29, tzinfo=datetime.timezone.utc),
                            "history_type": "added",
                            "model_name": "state",
                        },
                    ]


                    class Migration(migrations.Migration):
                        dependencies = [
                            ("erring", "0002_workflow_migrations_2026_03_24"),
                            ("vueda_workflow", "0009_remove_historicalobjectstate_history_relation_and_more"),
                        ]

                        operations = []
                    """
                )
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            changed_data, problem = read_changed_data(path.read_text(), path)
            assert problem is None
            assert changed_data[0]["changes"]["workflow_id"] == {
                "code": "queueitem",
                "historical_app_label": "vueda_vdq",
                "historical_model": "queueitem",
            }

    def test_a_file_that_cannot_be_read_fails_and_the_others_are_still_refreshed(self, settings):
        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            refreshed = write_old_migration(
                employee_dir,
                "0002_group_permission_migrations_2026_06_29",
                "group_copied_2026_06.py.txt",
                (("employee", "0001_initial"), USER_SCHEMA),
            )
            unreadable = Path(employee_dir) / "0003_group_permission_migrations_2026_06_30.py"
            unreadable.write_bytes(
                b"# Generated by Django 6.1 on 2026-06-30 00:00\n"
                + group_operations.LEGACY_MIGRATION_MODIFIED_COMMENT.encode()
                + b"changed_data = ['\xff\xfe']\n"
            )

            out, err, status = run_update()

            assert status == 1
            assert f"Could not read {unreadable}:" in err
            assert f"Updating: {refreshed}" in out
            assert "Failed updating 1 migration(s)." in out

    def test_changed_data_that_cannot_be_read_fails_that_workflow_migration(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_workflow_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "[{'model_name': 'state', 'changes': {}}]",
            )
            before = path.read_text()

            out, err, status = run_update()

            assert status == 1
            assert f"Could not update {path}: Could not read changed_data: change 0 has no 'history_date'" in err
            assert "Failed updating 1 migration(s)." in out
            assert path.read_text() == before

    def test_naive_dates_are_read_as_utc_with_a_warning(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_workflow_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                STATE_ADDED.format(history_date="datetime.datetime(2026, 6, 29)"),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Naive dates found in changed_data in {path}. Treating as UTC." in out
            assert f"Updating: {path}" in out

    def test_changed_data_that_a_package_records_but_cannot_be_read_is_only_a_warning(self, settings, monkeypatch):
        """The workflow history is read only when a workflow migration can be refreshed, so store has one."""
        with (
            self.temporary_migration_module(settings, app_label="store") as store_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            refreshed = write_old_migration(
                store_dir,
                "0012_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("store", "0011_customerorder_object_stream"), WORKFLOW_SCHEMA),
            )
            packaged = write_workflow_migration(
                erring_dir, "0003_workflow_migrations_2026_06_29", "[{'model_name': 'state', 'changes': {}}]"
            )
            monkeypatch.setattr(
                dependencies,
                "INSTALLED_PACKAGE_PATHS",
                (*dependencies.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert (
                f"Could not read changed_data in {packaged}: change 0 has no 'history_date'. "
                "The workflows it records are not used to name references."
            ) in out
            assert f"Updating: {refreshed}" in out

    def test_a_package_migration_that_cannot_be_read_is_only_a_warning(self, settings, monkeypatch):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            packaged = write_workflow_migration(
                erring_dir, "0003_workflow_migrations_2026_06_29", "[{'model_name': 'state', 'changes': {}}]"
            )
            packaged.write_bytes(packaged.read_bytes() + b"# Caf\xe9\n")
            monkeypatch.setattr(
                dependencies,
                "INSTALLED_PACKAGE_PATHS",
                (*dependencies.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"  Could not read {packaged}: " in out
            assert (
                "If it is a generated workflow migration, the workflows it records are not used to name references."
            ) in out

    def test_a_refreshed_migration_keeps_its_file_permissions(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            readable_by_everyone = 0o644
            path.chmod(readable_by_everyone)

            out, _err, status = run_update()

            assert status == 0
            assert f"Updating: {path}" in out
            assert stat.S_IMODE(path.stat().st_mode) == readable_by_everyone

    def test_a_migration_that_the_graph_does_not_include_fails_only_that_file(self, settings, monkeypatch):
        """While a squash is unfinished, a migration that it replaces is on disk but not in the graph."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()

            def replaced_by_a_squash(loader, migration_key):
                raise NodeNotFoundError("replaced", migration_key)

            monkeypatch.setattr(workflow_refresh, "requires_workflow_events", replaced_by_a_squash)

            _out, err, status = run_update()

            assert status == 1
            assert f"Cannot update {path}: the migration graph does not include it" in err
            assert path.read_text() == before

    def test_a_hand_written_migration_in_another_encoding_and_an_underscore_file_are_not_counted(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            (Path(erring_dir) / "0003_hand_written.py").write_bytes(
                b"# -*- coding: latin-1 -*-\n# Caf\xe9\nfrom django.db import migrations\n\n\n"
                b"class Migration(migrations.Migration):\n"
                b"    dependencies = [('erring', '0002_workflow_migrations_2026_03_24')]\n"
                b"    operations = []\n"
            )
            parked = write_old_migration(
                erring_dir,
                "_0004_workflow_migrations_parked",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0003_hand_written"), WORKFLOW_SCHEMA),
            )
            before = parked.read_text()

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert "0003_hand_written" not in out
            assert str(parked) not in out
            assert parked.read_text() == before

    def test_a_failed_refresh_says_when_it_fixed_the_imports_first(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_07_01",
                "workflow_imported_old_module_2026_07.py.txt",
                (("erring", "0001_initial"), WORKFLOW_SCHEMA_BEFORE_EVENTS),
            )

            _out, err, status = run_update()

            assert status == 1
            assert f"Cannot update {path}: its dependencies do not include vueda_workflow.0008_" in err
            assert "Its imports of removed modules were fixed. The rest of the file was left unchanged." in err
            assert "management.commands.makeworkflowmigrations" not in path.read_text()

    def test_a_refresh_that_fails_for_another_reason_still_gets_its_import_fix(self, settings):
        """Its old import would stop the migration graph, and with it every other workflow migration."""
        with (
            self.temporary_migration_module(settings, app_label="store") as store_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            healthy = write_old_migration(
                store_dir,
                "0012_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("store", "0011_customerorder_object_stream"), WORKFLOW_SCHEMA),
            )
            broken = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_07_01",
                "workflow_imported_old_module_2026_07.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            broken.write_text(
                broken.read_text().replace(
                    'history_change_reason = "Workflow Migration - 0004_workflow_migrations_2026_07_01"\n', ""
                )
            )

            out, err, status = run_update()

            assert status == 1
            assert f"Could not update {broken}: Could not find history_change_reason" in err
            assert "management.commands.makeworkflowmigrations" not in broken.read_text()
            assert f"Updating: {healthy}" in out

    def test_an_app_whose_path_has_a_package_directory_name_is_never_rewritten(self, settings, monkeypatch):
        """A package installed with pip install --target sits outside this interpreter's package directories."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()
            # The temporary module's own directory name stands in for a site-packages directory.
            monkeypatch.setattr(
                dependencies, "INSTALLED_PACKAGE_DIRECTORY_NAMES", frozenset((Path(erring_dir).parent.name,))
            )

            out, _err, _status = run_update()

            assert str(path) not in out
            assert path.read_text() == before

    def test_a_migration_linked_into_a_package_is_never_rewritten(self, settings, monkeypatch):
        with (
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
            self.temporary_migration_module(settings, app_label="store") as store_dir,
        ):
            packaged = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("store", "0011_customerorder_object_stream"), WORKFLOW_SCHEMA),
            )
            linked = Path(store_dir) / "0012_workflow_migrations_2026_06_29.py"
            linked.symlink_to(packaged)
            before = packaged.read_text()
            monkeypatch.setattr(
                dependencies,
                "INSTALLED_PACKAGE_PATHS",
                (*dependencies.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, _err, _status = run_update()

            assert str(linked) not in out
            assert packaged.read_text() == before

    def test_changed_data_assigned_in_a_chain_fails_that_migration_with_a_message(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_workflow_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                STATE_ADDED.format(history_date="datetime.datetime(2026, 6, 29, tzinfo=datetime.timezone.utc)"),
            )
            path.write_text(path.read_text().replace("changed_data = [", "recorded = changed_data = [", 1))
            before = path.read_text()

            _out, err, status = run_update()

            assert status == 1
            assert f"Could not update {path}: changed_data is assigned in a way that the command cannot rewrite" in err
            assert path.read_text() == before

    def test_a_package_migration_that_is_not_valid_python_is_only_a_warning(self, settings, monkeypatch):
        with (
            self.temporary_migration_module(settings, app_label="store") as store_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            write_old_migration(
                store_dir,
                "0012_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("store", "0011_customerorder_object_stream"), WORKFLOW_SCHEMA),
            )
            broken = Path(erring_dir) / "0003_workflow_migrations_2026_06_29.py"
            broken.write_text(
                "# Generated by Django 6.1 on 2026-06-29 00:00\n"
                + workflow_operations.LEGACY_MIGRATION_MODIFIED_COMMENT
                + "changed_data = [\n"
            )
            monkeypatch.setattr(
                dependencies,
                "INSTALLED_PACKAGE_PATHS",
                (*dependencies.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, _err, _status = run_update()

            assert f"Could not read {broken}:" in out
            assert "The workflows it records are not used to name references." in out

    def test_a_dropped_import_that_is_still_used_is_not_written_early(self, settings):
        """The import fix is written before the graph is built only when it leaves the migration working."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_07_01",
                "workflow_imported_old_module_2026_07.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            path.write_text(
                path.read_text().replace(
                    "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
                    "from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data\n"
                    "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
                )
                + "\n\ndef my_own_step(apps, schema_editor):\n    return add_history_to_data({})\n"
            )
            before = path.read_text()

            _out, err, status = run_update()

            assert status == 1
            assert "still uses add_history_to_data, which VUEDA no longer has" in err
            assert path.read_text() == before

    def test_a_dropped_import_that_only_a_replaced_copy_uses_is_written_early(self, settings):
        """The refresh replaces the copied function that uses the dropped name, so the import fix is safe."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_07_01",
                "workflow_imported_old_module_2026_07.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            path.write_text(
                path.read_text()
                .replace(
                    "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
                    "from vueda.workflow.management.commands.makeworkflowmigrations import add_history_to_data\n"
                    "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n",
                )
                .replace(
                    "    forwards_migrate_workflow(apps, copy.deepcopy(changed_data), history_change_reason)\n",
                    "    add_history_to_data(changed_data)\n"
                    "    forwards_migrate_workflow(apps, copy.deepcopy(changed_data), history_change_reason)\n",
                )
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            source = path.read_text()
            assert "add_history_to_data" not in source
            assert "management.commands.makeworkflowmigrations" not in source

    def test_a_circular_dependency_fails_each_workflow_migration_with_a_message(self, settings, monkeypatch):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()

            def circular(_loader, _migration_key):
                raise CircularDependencyError("erring.0003_workflow_migrations_2026_06_29")

            monkeypatch.setattr(workflow_refresh, "requires_workflow_events", circular)

            _out, err, status = run_update()

            assert status == 1
            assert (
                f"Cannot update {path}: the migration graph has a circular dependency: "
                "erring.0003_workflow_migrations_2026_06_29."
            ) in err
            assert path.read_text() == before

    def test_rewritten_changed_data_follows_the_migrations_project_settings(self, settings):
        """The formatter reads the settings that apply to the migration's own path.

        A formatter keeps the trailing comma after the last change, which pformat never writes. With the
        formatter shown to have run, single quotes show that it read the migration's settings, since neither ruff
        nor black defaults to them.
        """
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            (Path(erring_dir).parent / "pyproject.toml").write_text('[tool.ruff.format]\nquote-style = "single"\n')
            path = write_workflow_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                STATE_ADDED.format(history_date="datetime.datetime(2026, 6, 29)"),
            )

            _out, err, status = run_update()

            assert (status, err) == (0, "")
            source = path.read_text()
            assignment = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") == "changed_data"
            )
            changed_data_source = ast.get_source_segment(source, assignment)
            assert re.search(r",\s*\]$", changed_data_source)
            assert "'history_type'" in changed_data_source

    def test_a_dry_run_reports_a_formatter_error_without_claiming_a_write(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            # ruff cannot read this setting, so it fails on the rewritten changed_data.
            (Path(erring_dir).parent / "pyproject.toml").write_text('[tool.ruff]\nline-length = "long"\n')
            path = write_workflow_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                STATE_ADDED.format(history_date="datetime.datetime(2026, 6, 29)"),
            )
            before = path.read_text()

            out, err, status = run_update("--dry-run")

            assert status == 0
            assert f"Would update: {path}" in out
            assert err.startswith(f"  ruff could not format changed_data for {path}:\n")
            assert err.endswith(
                "  A run without --dry-run would write changed_data with pprint instead. Fix the problem above first.\n"
            )
            assert path.read_text() == before

    @pytest.mark.skipif(os.geteuid() == 0, reason="root can write a read-only file")
    def test_a_read_only_migration_is_not_replaced(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = path.read_text()
            path.chmod(0o444)

            _out, err, status = run_update()

            assert status == 1
            assert f"Could not write {path}:" in err
            assert path.read_text() == before
