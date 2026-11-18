"""updatevuedamigrations refreshes the generated migrations that earlier versions of VUEDA wrote.

The tests that only rewrite text need no database. The import rewrites run on source text, because Django imports
every migration when it builds the migration graph, and an import of a removed module would stop that.
"""

import io
import re
import textwrap
from pathlib import Path

import pytest

from vueda.user.management.commands.utils import merge_migration_sources
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
