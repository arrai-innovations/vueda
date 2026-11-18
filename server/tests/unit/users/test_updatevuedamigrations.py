"""updatevuedamigrations refreshes the generated migrations that earlier versions of VUEDA wrote.

The tests that only rewrite text need no database. The import rewrites run on source text, because Django imports
every migration when it builds the migration graph, and an import of a removed module would stop that.
"""

import textwrap

from vueda.user.migration_generation.refresh import rewrite_removed_imports


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
