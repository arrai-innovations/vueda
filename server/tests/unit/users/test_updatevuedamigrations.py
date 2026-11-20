"""updatevuedamigrations refreshes the generated migrations that earlier versions of VUEDA wrote.

The tests that only rewrite text need no database.
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
from django.apps import apps as django_apps
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db.migrations.exceptions import NodeNotFoundError

import vueda
from tests.utils import BaseTestMigrations
from vueda.user.management.commands.utils import merge_migration_sources
from vueda.user.migration_generation import operations as group_operations
from vueda.user.migration_generation import utils as migration_utils
from vueda.user.migration_generation.refresh import RefreshError
from vueda.user.migration_generation.refresh import refresh_migration
from vueda.user.migration_generation.refresh import remove_imports_that_stop_the_graph
from vueda.user.migration_generation.refresh import remove_imports_that_vueda_no_longer_has
from vueda.user.migration_generation.refresh import remove_obsolete_names
from vueda.user.migration_generation.tools import GROUP_MIGRATION_KIND
from vueda.workflow.migration_generation import operations as workflow_operations
from vueda.workflow.migration_generation import refresh as workflow_refresh
from vueda.workflow.migration_generation.refresh import changed_data_updater
from vueda.workflow.migration_generation.refresh import collect_workflow_identities
from vueda.workflow.migration_generation.refresh import read_changed_data
from vueda.workflow.migration_generation.tools import WORKFLOW_MIGRATION_KIND


# Frozen copies of migrations that earlier versions generated. They are text, so nothing imports them by accident.
OLD_MIGRATIONS = Path(__file__).parent / "old_migrations"


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
        pytest.param(
            "from django.utils import timezone\n\nfrom django.db.models import Count\n\nX = 1\n",
            "X = 1\n",
            id="two-groups-at-the-top",
        ),
    ],
)
def test_an_obsolete_import_keeps_the_gaps_between_import_groups(source, expected):
    result, _removed = remove_obsolete_names(source, WORKFLOW_MIGRATION_KIND.obsolete_names)

    assert result == expected


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


def test_an_app_whose_migration_modules_entry_does_not_exist_yet_is_not_installed(settings, monkeypatch):
    """The project creates the module that MIGRATION_MODULES names, so the app's own directory does not decide."""
    app_path = os.path.normcase(os.path.realpath(django_apps.get_app_config("erring").path))
    monkeypatch.setattr(
        migration_utils, "INSTALLED_PACKAGE_PATHS", (*migration_utils.INSTALLED_PACKAGE_PATHS, app_path)
    )
    assert migration_utils.is_installed_package_app("erring")
    settings.MIGRATION_MODULES = {"erring": "tests.erring.migrations_not_created_yet"}

    assert not migration_utils.is_installed_package_app("erring")


def test_an_app_whose_migration_modules_entry_is_a_single_module_is_judged_by_its_own_directory(settings, monkeypatch):
    """Only a module that does not exist yet moves the decision to the project. tests.settings exists."""
    app_path = os.path.normcase(os.path.realpath(django_apps.get_app_config("erring").path))
    monkeypatch.setattr(
        migration_utils, "INSTALLED_PACKAGE_PATHS", (*migration_utils.INSTALLED_PACKAGE_PATHS, app_path)
    )
    settings.MIGRATION_MODULES = {"erring": "tests.settings"}

    assert migration_utils.is_installed_package_app("erring")


def test_a_module_whose_package_fails_on_its_own_import_still_exists(monkeypatch):
    """A package that cannot import an optional dependency is broken, not missing, so its modules are not gone."""

    def find_spec(name):
        raise ModuleNotFoundError("No module named 'optional_dependency'", name="optional_dependency")

    monkeypatch.setattr(migration_utils.importlib.util, "find_spec", find_spec)

    with pytest.raises(ModuleNotFoundError):
        migration_utils.module_exists("vueda.user.migration_generation.tools")


def test_a_path_with_a_site_packages_part_counts_as_installed(monkeypatch):
    """A package installed with pip install --target, or kept on PYTHONPATH, is outside this interpreter's own
    package directories."""
    monkeypatch.setattr(
        migration_utils, "get_migrations_path", lambda app_config: "/srv/deps/site-packages/x/migrations"
    )

    assert migration_utils.is_installed_package_app("erring")


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
        (
            "import datetime\n"
            "changed_data = [{'model_name': 'workflow', 'history_date': datetime.datetime(2026, 6, 29), "
            "'changes': {'code': ['a', 'b']}}]",
            "change 0 has a workflow code that is not a single value",
        ),
        (
            "import datetime\n"
            "changed_data = [{'model_name': 'state', 'history_date': datetime.datetime(2026, 6, 29), "
            "'changes': {'workflow_id': {'code': ['a']}}}]",
            "change 0 has a workflow code that is not a single value",
        ),
        (
            "import datetime\n"
            "changed_data = [{'model_name': 'workflow', 'history_date': datetime.datetime(2026, 6, 29), "
            "'changes': {'code': ('a',)}}]",
            "change 0 has a workflow code that is not a single value",
        ),
        ("changed_data = 1 / 0", "division by zero"),
    ],
)
def test_changed_data_that_a_refresh_cannot_read_names_the_reason(changed_data_source, problem):
    assert read_changed_data(changed_data_source, "unreadable.py") == (None, problem)


def test_an_import_that_a_copied_function_replaces_is_removed():
    """Some group migrations import two helpers instead of holding copies of them. The copies replace the imports."""
    source = (OLD_MIGRATIONS / "group_imported_helpers_2026_04.py.txt").read_text()

    result = refresh_migration(source, GROUP_MIGRATION_KIND)

    assert result.replaced_imports == (
        "vueda.user.management.commands.utils.create_group_change",
        "vueda.user.management.commands.utils.get_matching_record",
    )
    assert "from vueda.user.management.commands.utils import" not in result.source
    assert "\ndef create_group_change(change, group_change_model):" in result.source
    assert "\ndef get_matching_record(change, group_change_model):" in result.source
    assert not refresh_migration(result.source, GROUP_MIGRATION_KIND).changed


def test_functions_imported_from_a_module_that_no_longer_exists_are_copied_in():
    """A migration can import the functions that it runs. The copies replace those imports, even from a module that
    VUEDA has removed."""
    source = (OLD_MIGRATIONS / "group_copied_2026_06.py.txt").read_text()
    source = source.replace(
        "from django.db import migrations\n",
        "from django.db import migrations\n"
        "from vueda.user.management.commands.makegroupmigrations import backwards_migrate_groups\n"
        "from vueda.user.management.commands.makegroupmigrations import forwards_migrate_groups\n",
    )

    result = refresh_migration(source, GROUP_MIGRATION_KIND)

    assert result.replaced_imports == (
        "vueda.user.management.commands.makegroupmigrations.backwards_migrate_groups",
        "vueda.user.management.commands.makegroupmigrations.forwards_migrate_groups",
    )
    assert "commands.makegroupmigrations import" not in result.source


def test_an_import_statement_keeps_the_names_that_are_not_copied():
    source = (OLD_MIGRATIONS / "group_imported_helpers_2026_04.py.txt").read_text()
    source = (
        source.replace(
            "from vueda.user.management.commands.utils import create_group_change\n",
            "from vueda.user.management.commands.utils import NEWLINE, create_group_change\n",
        )
        + "\n\nSEPARATOR = NEWLINE\n"
    )

    result = refresh_migration(source, GROUP_MIGRATION_KIND)

    assert "from vueda.user.management.commands.utils import NEWLINE\n" in result.source
    assert "import create_group_change" not in result.source


def test_a_rewritten_import_statement_does_not_move_another_import_that_goes():
    """An import that keeps some names is rewritten one name per line, which moves the lines below it. The import
    that loses every name is still the one deleted."""
    source = (OLD_MIGRATIONS / "group_imported_helpers_2026_04.py.txt").read_text()
    source = (
        source.replace(
            "from vueda.user.management.commands.utils import create_group_change\n",
            "from vueda.user.management.commands.utils import NEWLINE, get_migrations_path, create_group_change\n"
            "import json\n",
        )
        + "\n\nSEPARATOR = (NEWLINE, get_migrations_path, json.dumps([]))\n"
    )

    result = refresh_migration(source, GROUP_MIGRATION_KIND)

    assert "import json\n" in result.source
    assert "import get_matching_record" not in result.source
    assert "from vueda.user.management.commands.utils import NEWLINE\n" in result.source
    assert "from vueda.user.management.commands.utils import get_migrations_path\n" in result.source


def test_a_gone_import_that_the_migration_shadows_with_its_own_definition_can_go():
    """The migration defines the name again after its imports, so the import is never what the module uses."""
    source = (
        "from vueda.workflow.management.commands.makeworkflowmigrations import forwards\n\n\n"
        "def forwards(apps, schema_editor):\n    pass\n\n\n"
        "class Migration:\n    operations = [forwards]\n"
    )

    assert "makeworkflowmigrations" not in remove_imports_that_stop_the_graph(source, WORKFLOW_MIGRATION_KIND)[0]


@pytest.mark.parametrize(
    "code",
    [
        pytest.param("helper.flag = True\n", id="attribute-assignment"),
        pytest.param("helper += 1\n", id="augmented-assignment"),
        pytest.param("helper: int\nX = helper\n", id="annotation-without-value"),
        pytest.param("X = helper\n\n\ndef helper():\n    pass\n", id="read-before-its-definition"),
        pytest.param(
            "def f():\n    return helper()\n\n\nX = f()\n\n\ndef helper():\n    pass\n",
            id="called-while-the-module-loads",
        ),
    ],
)
def test_a_gone_import_that_the_migration_still_needs_while_it_loads_is_refused(code):
    """None of these statements gives the module its own helper before it reads the name, so the import cannot
    go."""
    source = "from vueda.workflow.management.commands.makeworkflowmigrations import helper\n\n" + code

    with pytest.raises(
        RefreshError, match=r"uses vueda\.workflow\.management\.commands\.makeworkflowmigrations\.helper"
    ):
        remove_imports_that_vueda_no_longer_has(source)
    assert remove_imports_that_stop_the_graph(source, WORKFLOW_MIGRATION_KIND) == (source, ())


@pytest.mark.parametrize(
    "code",
    [
        pytest.param("helper = 5\nX = helper\n", id="assignment"),
        pytest.param("helper, other = 1, 2\n", id="unpacking"),
    ],
)
def test_a_gone_import_that_an_assignment_replaces_can_go(code):
    source = "from vueda.workflow.management.commands.makeworkflowmigrations import helper\n\n" + code

    result, removed = remove_imports_that_vueda_no_longer_has(source)

    assert removed == ("vueda.workflow.management.commands.makeworkflowmigrations.helper",)
    assert "import helper" not in result


def test_a_function_used_as_a_decorator_runs_while_the_migration_loads():
    """The decorator reads the imported name when the decorated function is defined, so the import has to stay."""
    source = (
        "from vueda.user.management.commands.makegroupmigrations import forwards_migrate_groups\n\n\n"
        "def register(function):\n    forwards_migrate_groups\n    return function\n\n\n"
        "@register\ndef step():\n    pass\n"
    )

    assert remove_imports_that_stop_the_graph(source, GROUP_MIGRATION_KIND) == (source, ())


def test_changed_data_is_read_without_the_functions_and_the_migration_class():
    """The class body names a function from an import that VUEDA no longer has. Reading changed_data runs only the
    imports and the assignments, so neither can stop the read."""
    source = (
        "import datetime\n"
        "from vueda.workflow.management.commands.makeworkflowmigrations import forwards\n\n"
        "changed_data = [{'model_name': 'state', 'history_date': datetime.datetime(2026, 6, 29), 'changes': {}}]\n\n\n"
        "class Migration:\n    operations = [forwards]\n"
    )

    changed_data, problem = read_changed_data(source, "kept.py")

    assert problem is None
    assert changed_data[0]["model_name"] == "state"


def test_a_star_import_of_code_that_vueda_no_longer_has_is_refused():
    """The names that it supplies cannot be checked, so the refresh cannot tell whether removing it is safe."""
    source = (OLD_MIGRATIONS / "group_copied_2026_06.py.txt").read_text()
    source = source.replace(
        "from django.db import migrations\n",
        "from django.db import migrations\nfrom vueda.user.management.commands.makegroupmigrations import *\n",
    )

    with pytest.raises(
        RefreshError, match=r"imports everything from vueda\.user\.management\.commands\.makegroupmigrations"
    ):
        refresh_migration(source, GROUP_MIGRATION_KIND)


def test_a_name_that_vueda_no_longer_has_is_refused_when_the_migration_uses_it():
    """The migration would fail when it runs, and nothing can copy a name that VUEDA no longer has."""
    source = (OLD_MIGRATIONS / "group_copied_2026_06.py.txt").read_text()
    source = (
        source.replace(
            "from django.db import migrations\n",
            "from django.db import migrations\n"
            "from vueda.user.management.commands.makegroupmigrations import retired_helper\n",
        )
        + "\n\ndef my_own_step(apps, schema_editor):\n    return retired_helper()\n"
    )

    with pytest.raises(
        RefreshError, match=r"uses vueda\.user\.management\.commands\.makegroupmigrations\.retired_helper"
    ):
        refresh_migration(source, GROUP_MIGRATION_KIND)


def test_an_unused_import_of_a_name_that_vueda_no_longer_has_is_removed():
    source = (OLD_MIGRATIONS / "group_copied_2026_06.py.txt").read_text()
    source = source.replace(
        "from django.db import migrations\n",
        "from django.db import migrations\n"
        "from vueda.user.management.commands.makegroupmigrations import retired_helper\n",
    )

    result = refresh_migration(source, GROUP_MIGRATION_KIND)

    assert result.removed_missing_imports == ("vueda.user.management.commands.makegroupmigrations.retired_helper",)
    assert "commands.makegroupmigrations import" not in result.source


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
            "group_imported_helpers_2026_04.py.txt",
            GROUP_MIGRATION_KIND,
            "def forwards_migrate_groups(apps, changed_items):",
            (),
        ),
        (
            "workflow_copied_2026_06.py.txt",
            WORKFLOW_MIGRATION_KIND,
            "def forwards_migrate_workflow(apps, changed_items, change_reason):",
            ("add_history_to_data",),
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


def test_a_workflow_reference_inside_a_list_gains_its_app_and_model():
    """A hand-edited change can hold its references in a list instead of a tuple."""
    source = (OLD_MIGRATIONS / "workflow_copied_2026_06.py.txt").read_text()
    changed_data, _problem = read_changed_data(source, "workflow_copied_2026_06.py")
    identities = collect_workflow_identities([changed_data])
    change = next(
        item for item in changed_data if "workflow_id" in item["changes"] and "code" in item["changes"]["workflow_id"]
    )
    reference = {"workflow_id": {"code": change["changes"]["workflow_id"]["code"]}}
    recorded_at = workflow_refresh.recorded_at_utc(change["history_date"])

    from_tuple = workflow_refresh.add_workflow_identities((reference,), identities, recorded_at)
    from_list = workflow_refresh.add_workflow_identities([reference], identities, recorded_at)

    assert "historical_app_label" in from_tuple[0]["workflow_id"]
    assert from_list == [from_tuple[0]]


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
        ("group_imported_helpers_2026_04.py.txt", GROUP_MIGRATION_KIND),
        ("workflow_copied_2026_06.py.txt", WORKFLOW_MIGRATION_KIND),
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
            migration_utils, "INSTALLED_PACKAGE_PATHS", (*migration_utils.INSTALLED_PACKAGE_PATHS, source_tree)
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

    def test_a_workflow_migration_that_runs_before_the_workflow_events_is_skipped(self, settings):
        """The migration has to keep the functions that it was written with, so the run does not count it as a
        failure."""
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

            assert (status, err) == (0, "")
            assert f"Skipping: {path}" in out
            assert "\n  Its dependencies do not include vueda_workflow.0008_" in out
            assert "Keep its existing functions; review the migration graph before changing dependencies." in out
            assert "Skipped 1 migration(s) that must keep their functions." in out
            assert path.read_text() == before

    def test_a_skipped_migration_is_skipped_even_when_its_refresh_would_fail(self, settings):
        """A migration that keeps its functions is never refreshed, so nothing that a refresh rejects can fail it."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0001_initial"), WORKFLOW_SCHEMA_BEFORE_EVENTS),
            )
            path.write_text(re.sub(r"^history_change_reason = .*\n", "", path.read_text(), count=1, flags=re.MULTILINE))
            before = path.read_text()

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Skipping: {path}" in out
            assert path.read_text() == before

    def test_a_group_migration_with_a_stale_import_does_not_stop_the_workflow_migrations(self, settings):
        """Group migrations are refreshed before the migration graph is built, which imports every migration."""
        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            group = write_old_migration(
                employee_dir,
                "0002_group_permission_migrations_2026_06_29",
                "group_copied_2026_06.py.txt",
                (("employee", "0001_initial"), USER_SCHEMA),
            )
            group.write_text(
                group.read_text().replace(
                    "from django.db import migrations\n",
                    "from django.db import migrations\n"
                    "from vueda.user.management.commands.makegroupmigrations import retired_helper\n",
                )
            )
            workflow = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {group}" in out
            assert (
                "  Removed the import of vueda.user.management.commands.makegroupmigrations.retired_helper, "
                "which VUEDA no longer has."
            ) in out
            assert f"Updating: {workflow}" in out

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
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
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

    def test_a_dry_run_builds_the_graph_from_the_refreshed_group_migrations(self, settings):
        """A real run writes the refreshed group migrations before it builds the graph. A dry run writes nothing,
        so the graph reads their refreshed text from memory, and the dry run reports what the real run does."""
        with (
            self.temporary_migration_module(settings, app_label="employee") as employee_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            group = write_old_migration(
                employee_dir,
                "0002_group_permission_migrations_2026_06_29",
                "group_copied_2026_06.py.txt",
                (("employee", "0001_initial"), USER_SCHEMA),
            )
            source = group.read_text()
            forwards = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.FunctionDef) and node.name == "forwards_migrate_groups"
            )
            lines = source.splitlines(keepends=True)
            del lines[forwards.lineno - 1 : forwards.end_lineno]
            # The operations name the imported function, so the import has to stay while the file loads.
            imported = "from vueda.user.management.commands.makegroupmigrations import forwards_migrate_groups\n"
            group.write_text(
                "".join(lines).replace(
                    "from django.db import migrations\n", f"from django.db import migrations\n{imported}", 1
                )
            )
            workflow = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            before = {path: path.read_text() for path in (group, workflow)}

            out, err, status = run_update("--dry-run")

            assert (status, err) == (0, "")
            assert f"Would update: {group}" in out
            assert f"Would update: {workflow}" in out
            assert {path: path.read_text() for path in before} == before

    def test_a_graph_that_a_missing_import_stops_names_the_migration_that_imports_it(self, settings):
        """The graph cannot load, so the command cannot fix the import itself, but it can say which file to fix."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            path.write_text(
                path.read_text().replace(
                    "import copy\n",
                    "import copy\n\n"
                    "from vueda.workflow.management.commands.makeworkflowmigrations import retired_helper\n",
                    1,
                )
                # A name that the migration uses, defines nowhere, and no refresh copies in has to stay imported.
                + "\n\ndef my_own_step(apps, schema_editor):\n    return retired_helper()\n"
            )

            _out, err, status = run_update()

            assert status == 1
            assert f"vueda.workflow.management.commands.makeworkflowmigrations is imported by {path}" in err

    def test_a_workflow_migration_that_imports_its_forwards_function_gets_a_copy(self, settings):
        """The operations call the copied wrappers, and the wrappers call forwards_migrate_workflow, which the
        migration imports from a module that VUEDA removed. The import goes before the graph is built, and the
        refresh copies the function in."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            # The current copied form, with forwards_migrate_workflow imported instead of copied.
            source = refresh_migration(path.read_text(), WORKFLOW_MIGRATION_KIND).source
            forwards = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.FunctionDef) and node.name == "forwards_migrate_workflow"
            )
            lines = source.splitlines(keepends=True)
            del lines[forwards.lineno - 1 : forwards.end_lineno]
            imported = (
                "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n"
            )
            path.write_text(
                "".join(lines).replace(
                    "from django.db import migrations\n", f"from django.db import migrations\n{imported}", 1
                )
            )
            assert "\ndef forwards_migrate_workflow(" not in path.read_text()

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            assert (
                "  Replaced the import of vueda.workflow.management.commands.makeworkflowmigrations."
                "forwards_migrate_workflow with a copy."
            ) in out
            refreshed = path.read_text()
            assert "\ndef forwards_migrate_workflow(apps, changed_items, change_reason):" in refreshed
            assert "makeworkflowmigrations import" not in refreshed
            # The module that the graph loaded without the import is unloaded again, and its package no longer
            # holds it.
            assert not [name for name in sys.modules if name.endswith(".0003_workflow_migrations_2026_06_29")]
            package = sys.modules[settings.MIGRATION_MODULES["erring"]]
            assert not hasattr(package, "0003_workflow_migrations_2026_06_29")

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Already up to date: {path}" in out

    def test_a_migration_that_must_keep_its_functions_but_imports_gone_vueda_code_fails(self, settings):
        """The migration runs before vueda_workflow 0008, so the command keeps its functions and copies nothing in.
        Its wrappers still call a name that only the gone import supplies, so migrate would fail on it, and the
        file needs a hand fix."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0001_initial"), WORKFLOW_SCHEMA_BEFORE_EVENTS),
            )
            source = refresh_migration(path.read_text(), WORKFLOW_MIGRATION_KIND).source
            forwards = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.FunctionDef) and node.name == "forwards_migrate_workflow"
            )
            lines = source.splitlines(keepends=True)
            del lines[forwards.lineno - 1 : forwards.end_lineno]
            imported = (
                "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n"
            )
            path.write_text(
                "".join(lines).replace(
                    "from django.db import migrations\n", f"from django.db import migrations\n{imported}", 1
                )
            )
            before = path.read_text()

            _out, err, status = run_update()

            # The command cannot refresh it, and migrate would fail on its import, so it needs a hand fix.
            assert status == 1
            assert (
                f"Cannot update {path}: It needs a change by hand: it imports "
                "vueda.workflow.management.commands.makeworkflowmigrations.forwards_migrate_workflow, which VUEDA no "
                "longer has"
            ) in err
            assert "Replace each such import with a copy of the function as it was when the migration was made" in err
            assert imported in path.read_text()
            assert path.read_text() == before

    @pytest.mark.parametrize("dry_run", [False, True])
    def test_a_migration_that_keeps_its_functions_loses_a_gone_import_that_nothing_uses(self, settings, dry_run):
        """migrate would fail on the import, and removing it cannot break the migration, so it goes even though the
        migration keeps its functions. The file then counts as updated."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0001_initial"), WORKFLOW_SCHEMA_BEFORE_EVENTS),
            )
            stale = "from vueda.workflow.management.commands.makeworkflowmigrations import retired_helper\n"
            original = path.read_text()
            path.write_text(original.replace("import copy\n", f"import copy\n{stale}", 1))
            before = path.read_text()

            out, err, status = run_update(*(("--dry-run",) if dry_run else ()))

            assert (status, err) == (0, "")
            assert f"{'Would update' if dry_run else 'Updating'}: {path}" in out
            assert "  Its functions stay as they are, because its dependencies do not include" in out
            assert (
                "  Removed the import of vueda.workflow.management.commands.makeworkflowmigrations.retired_helper, "
                "which VUEDA no longer has."
            ) in out
            assert path.read_text() == (before if dry_run else original)

    def test_a_failed_refresh_keeps_the_import_that_the_graph_loaded_without(self, settings):
        """The graph loads the migration without the import, and nothing is written. The refresh then fails for
        another reason, so nothing copies the function in, and the file keeps its import."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            source = refresh_migration(path.read_text(), WORKFLOW_MIGRATION_KIND).source
            forwards = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.FunctionDef) and node.name == "forwards_migrate_workflow"
            )
            lines = source.splitlines(keepends=True)
            del lines[forwards.lineno - 1 : forwards.end_lineno]
            imported = (
                "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n"
            )
            source = "".join(lines).replace(
                "from django.db import migrations\n", f"from django.db import migrations\n{imported}", 1
            )
            # Without history_change_reason, the refresh fails.
            path.write_text(re.sub(r"^history_change_reason = .*\n", "", source, count=1, flags=re.MULTILINE))
            before = path.read_text()

            _out, err, status = run_update()

            assert status == 1
            assert f"Could not update {path}: Could not find history_change_reason" in err
            assert imported in path.read_text()
            assert path.read_text() == before

    def test_a_migration_whose_operations_name_an_imported_function_is_refreshed(self, settings):
        """An operation reads the name while Django imports the migration, so the file cannot load as it is. The
        graph loads it as its refresh will leave it, with the operation renamed and the function copied in."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            # This older shape's operations name forwards_migrate_workflow directly.
            source = path.read_text()
            forwards = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.FunctionDef) and node.name == "forwards_migrate_workflow"
            )
            lines = source.splitlines(keepends=True)
            del lines[forwards.lineno - 1 : forwards.end_lineno]
            imported = (
                "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n"
            )
            path.write_text(
                "".join(lines).replace(
                    "from django.db import migrations\n", f"from django.db import migrations\n{imported}", 1
                )
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out
            refreshed = path.read_text()
            assert "makeworkflowmigrations import" not in refreshed
            assert "\ndef forwards_migrate_workflow(apps, changed_items, change_reason):" in refreshed
            assert "forwards_migrate_workflow_through_imports" in refreshed

    def test_the_graph_error_names_the_import_that_stays_rather_than_one_that_goes(self, settings):
        """The migration has two gone imports, and its own step still uses one of them, so its refresh fails. The
        graph then loads it without the unused one, so the error that stops the graph comes from the one in use."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            source = path.read_text()
            forwards = next(
                node
                for node in ast.parse(source).body
                if isinstance(node, ast.FunctionDef) and node.name == "forwards_migrate_workflow"
            )
            lines = source.splitlines(keepends=True)
            del lines[forwards.lineno - 1 : forwards.end_lineno]
            imports = (
                "from vueda.user.management.commands.makegroupmigrations import retired_helper\n"
                "from vueda.workflow.management.commands.makeworkflowmigrations import other_helper\n"
            )
            path.write_text(
                "".join(lines).replace(
                    "from django.db import migrations\n", f"from django.db import migrations\n{imports}", 1
                )
                + "\n\ndef my_own_step(apps, schema_editor):\n    return other_helper()\n"
            )

            _out, err, status = run_update()

            assert status == 1
            assert f"vueda.workflow.management.commands.makeworkflowmigrations is imported by {path}" in err
            assert "makegroupmigrations is imported by" not in err

    @pytest.mark.parametrize("dry_run", [False, True])
    def test_an_unused_import_that_vueda_no_longer_has_is_removed_before_the_graph_is_built(self, settings, dry_run):
        """Django imports every migration to build the graph. The graph loads the migration without the import, so a
        dry run checks it too, and only a real run removes the import from the file."""
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            stale = "from vueda.workflow.management.commands.makeworkflowmigrations import retired_helper\n"
            path.write_text(path.read_text().replace("import copy\n", f"import copy\n\n{stale}", 1))
            before = path.read_text()

            out, err, status = run_update(*(("--dry-run",) if dry_run else ()))

            if dry_run:
                assert (status, err) == (0, "")
                assert f"Would update: {path}" in out
                assert path.read_text() == before
            else:
                assert (status, err) == (0, "")
                assert f"Updating: {path}" in out
                assert stale not in path.read_text()

    def test_a_dry_run_reports_a_migration_graph_that_cannot_be_built(self, settings):
        """A dry run builds the migration graph as a real run does, so a missing dependency fails it too."""
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

    def test_a_migration_saved_with_a_byte_order_mark_is_refreshed(self, settings):
        with self.temporary_migration_module(settings, app_label="erring") as erring_dir:
            path = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            path.write_bytes(b"\xef\xbb\xbf" + path.read_bytes())

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {path}" in out

    def test_a_package_migration_with_a_gone_import_does_not_stop_the_graph(self, settings, monkeypatch):
        """No run rewrites a package's file, but the graph can still load it without the import."""
        with (
            self.temporary_migration_module(settings, app_label="store") as store_dir,
            self.temporary_migration_module(settings, app_label="erring") as erring_dir,
        ):
            project = write_old_migration(
                store_dir,
                "0012_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("store", "0011_customerorder_object_stream"), WORKFLOW_SCHEMA),
            )
            packaged = write_old_migration(
                erring_dir,
                "0003_workflow_migrations_2026_06_29",
                "workflow_copied_2026_06.py.txt",
                (("erring", "0002_workflow_migrations_2026_03_24"), WORKFLOW_SCHEMA),
            )
            stale = "from vueda.workflow.management.commands.makeworkflowmigrations import retired_helper\n"
            packaged.write_text(packaged.read_text().replace("import copy\n", f"import copy\n{stale}", 1))
            before = packaged.read_text()
            monkeypatch.setattr(
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, err, status = run_update()

            assert (status, err) == (0, "")
            assert f"Updating: {project}" in out
            assert packaged.read_text() == before

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
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
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
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
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
                migration_utils, "INSTALLED_PACKAGE_DIRECTORY_NAMES", frozenset((Path(erring_dir).parent.name,))
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
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
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
                migration_utils,
                "INSTALLED_PACKAGE_PATHS",
                (*migration_utils.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(erring_dir))),
            )

            out, _err, _status = run_update()

            assert f"Could not read {broken}:" in out
            assert "The workflows it records are not used to name references." in out

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

    @pytest.mark.xdist_group(name="management_command_tests")
    @pytest.mark.django_db(transaction=True)
    @pytest.mark.lean_database
    def test_a_refreshed_group_migration_replays_without_deleting_the_group(self, settings):
        """Older copied code deleted a group when its last permission was removed, which also dropped its users.

        The refreshed migration removes the permission and keeps the group, forwards and in reverse.
        """
        with self.temporary_migration_module(settings, app_label="employee") as employee_dir:
            path = write_old_migration(
                employee_dir,
                "0002_group_permission_migrations_2026_06_29",
                "group_copied_2026_06.py.txt",
                (("employee", "0001_initial"), USER_SCHEMA),
            )
            source = path.read_text()
            start = source.index("changed_data = [\n")
            end = source.index("\n]\n", start) + len("\n]\n")
            change = (
                '"group_name": "Replayed", "group_name_old": "", '
                '"historical_permission_codename": "view_permission", '
                '"historical_permission_content_type_app_label": "auth", '
                '"historical_permission_content_type_model_name": "permission", '
                '"historical_permission_name": "Can view permission"'
            )
            path.write_text(
                source[:start]
                + "changed_data = [\n"
                + f'    {{"change_type": "associated", {change}, '
                + '"when": datetime.datetime(2026, 6, 29, 15, 0, tzinfo=datetime.timezone.utc)},\n'
                + f'    {{"change_type": "deleted", {change}, '
                + '"when": datetime.datetime(2026, 6, 29, 16, 0, tzinfo=datetime.timezone.utc)},\n'
                + "]\n"
                + source[end:]
            )
            assert "group.delete()" in path.read_text()

            _out, err, status = run_update()

            assert (status, err) == (0, "")
            assert "group.delete()" not in path.read_text()

            call_command("migrate", "employee", path.stem, verbosity=0)

            group = Group.objects.get(name="Replayed")
            assert not group.permissions.exists()

            call_command("migrate", "employee", "0001_initial", verbosity=0)

            assert Group.objects.filter(name="Replayed").exists()

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
