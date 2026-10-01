import importlib.util
import io
import shutil
from pathlib import Path

import pytest
from django.core.management import call_command
from django.db.migrations.loader import MigrationLoader

from tests.utils import BaseTestMigrations
from vueda import workflow as workflow_module


WORKFLOW_EVENTS = "0008_initialstateevent_objectstateevent_stateevent_and_more"
VDQ_WORKFLOW = "0005_workflow_migrations_2025_11_21"


def read_migration(path):
    spec = importlib.util.spec_from_file_location("migration_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_workflow_migration(path, dependencies, *, import_instead=False):
    imports = ""
    if import_instead:
        imports = "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n"
    path.write_text(
        "# Modified using VUEDA makeworkflowmigrations command.  Please do not delete this comment.\n"
        "from django.db import migrations\n"
        f"{imports}\n"
        'history_change_reason = "Test workflow migration"\n'
        'migration_app_label = "vueda_vdq"\n'
        "changed_data = []\n\n"
        "def forwards_migrate_workflow_through_imports(apps, schema_editor):\n"
        '    raise AssertionError("old migration body")\n\n'
        "class Migration(migrations.Migration):\n"
        f"    dependencies = {dependencies!r}\n"
        "    operations = [migrations.RunPython(forwards_migrate_workflow_through_imports)]\n"
    )


class TestWorkflowRewriteDependencies(BaseTestMigrations):
    @pytest.mark.parametrize("dry_run", [False, True])
    def test_old_migrations_are_reported_and_left_unchanged(self, settings, dry_run):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            paths = sorted(Path(directory).glob("*workflow*.py"))
            originals = {path: path.read_bytes() for path in paths}
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", "vueda_vdq", dry_run=dry_run, stdout=output, stderr=errors)

            assert failure.value.code == 1
            assert {path: path.read_bytes() for path in paths} == originals
            for path in paths:
                assert f"Cannot update {path}: its dependencies do not include vueda_workflow.{WORKFLOW_EVENTS}" in (
                    errors.getvalue()
                )
            assert "2 workflow migration(s)" in output.getvalue()
            assert ("Would have failed updating" if dry_run else "Failed updating") in output.getvalue()
            assert "Updated " not in output.getvalue()
            assert "Would update 2" not in output.getvalue()

    @pytest.mark.parametrize("import_instead", [False, True])
    def test_no_workflow_dependency_is_rejected(self, settings, import_instead):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            path = Path(directory) / "0006_workflow_probe.py"
            write_workflow_migration(path, [("vueda_vdq", VDQ_WORKFLOW)], import_instead=import_instead)
            original = path.read_bytes()
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", "vueda_vdq", stdout=output, stderr=errors)

            assert failure.value.code == 1
            assert path.read_bytes() == original
            assert f"Cannot update {path}: its dependencies do not include" in errors.getvalue()
            assert "Failed updating 3 workflow migration(s)." in output.getvalue()

    @pytest.mark.parametrize("dependency_kind", ["direct", "indirect", "latest"])
    @pytest.mark.parametrize("import_instead", [False, True])
    @pytest.mark.parametrize("dry_run", [False, True])
    def test_compatible_migration_updates_even_when_older_files_are_skipped(
        self, settings, dependency_kind, import_instead, dry_run
    ):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            directory = Path(directory)
            dependencies = [
                ("vueda_vdq", VDQ_WORKFLOW),
                ("vueda_workflow", "__latest__" if dependency_kind == "latest" else WORKFLOW_EVENTS),
            ]
            if dependency_kind == "indirect":
                (directory / "0006_bridge.py").write_text(
                    "from django.db import migrations\n\n"
                    "class Migration(migrations.Migration):\n"
                    f"    dependencies = {dependencies!r}\n"
                    "    operations = []\n"
                )
                dependencies = [("vueda_vdq", "0006_bridge")]
            path = directory / "0007_workflow_probe.py"
            write_workflow_migration(path, dependencies, import_instead=import_instead)
            original = path.read_bytes()
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", "vueda_vdq", dry_run=dry_run, stdout=output, stderr=errors)

            assert failure.value.code == 1  # The two original vdq migrations cannot be rewritten.
            assert f"Cannot update {path}:" not in errors.getvalue()
            assert ("Would update" if dry_run else "Updated") + " 1 workflow migration(s)." in output.getvalue()
            assert ("Would have failed updating" if dry_run else "Failed updating") + " 2 workflow migration(s)." in (
                output.getvalue()
            )
            if dry_run:
                assert path.read_bytes() == original
            else:
                assert b"old migration body" not in path.read_bytes()
                migration = read_migration(path)
                assert migration.Migration.dependencies == dependencies
                assert migration.changed_data == []
                assert migration.Migration.operations[0].code is migration.forwards_migrate_workflow_through_imports

    def test_unresolvable_graph_is_reported_without_rewriting_files(self, settings):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            path = Path(directory) / "0006_workflow_probe.py"
            write_workflow_migration(path, [("vueda_vdq", "missing_migration")])
            originals = {item: item.read_bytes() for item in Path(directory).glob("*.py")}
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", "vueda_vdq", stdout=output, stderr=errors)

            assert failure.value.code == 1
            assert "Cannot resolve migration dependencies" in errors.getvalue()
            assert "missing_migration" in errors.getvalue()
            assert "Traceback" not in errors.getvalue()
            assert {item: item.read_bytes() for item in originals} == originals

    def test_squashed_workflow_prerequisite_allows_rewriting(self, settings):
        with (
            self.temporary_migration_module(settings, app_label="vueda_workflow") as workflow_directory,
            self.temporary_migration_module(settings, app_label="vueda_vdq") as vdq_directory,
        ):
            shutil.copytree(Path(workflow_module.__file__).parent / "sql", Path(workflow_directory).parent / "sql")
            original = read_migration(Path(workflow_directory) / f"{WORKFLOW_EVENTS}.py")
            # A replacement with the same schema changes stands in for the required migration.
            replacement = Path(workflow_directory) / "0008_squashed_events.py"
            replacement.write_text(
                "from importlib import import_module\n"
                "from django.db import migrations\n\n"
                "class Migration(migrations.Migration):\n"
                f"    replaces = [('vueda_workflow', {WORKFLOW_EVENTS!r})]\n"
                f"    dependencies = {original.Migration.dependencies!r}\n"
                f"    operations = import_module('vueda.workflow.migrations.{WORKFLOW_EVENTS}').Migration.operations\n"
            )
            path = Path(vdq_directory) / "0006_workflow_probe.py"
            write_workflow_migration(path, [("vueda_vdq", VDQ_WORKFLOW), ("vueda_workflow", WORKFLOW_EVENTS)])
            loader = MigrationLoader(None)
            ancestors = loader.graph.forwards_plan(("vueda_vdq", path.stem))
            assert ("vueda_workflow", WORKFLOW_EVENTS) not in ancestors
            assert ("vueda_workflow", replacement.stem) in ancestors
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", "vueda_vdq", stdout=output, stderr=errors)

            assert failure.value.code == 1
            assert "Updated 1 workflow migration(s)." in output.getvalue()
            assert f"Cannot update {path}:" not in errors.getvalue()
            assert b"old migration body" not in path.read_bytes()


def workflow_references(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "workflow_id":
                yield child
            yield from workflow_references(child)
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from workflow_references(child)


@pytest.mark.parametrize("name", ["0002_workflow_migrations_2025_09_22", "0005_workflow_migrations_2025_11_21"])
def test_shipped_workflow_migrations_name_every_workflow_reference(name):
    loader = MigrationLoader(None)
    migration = loader.disk_migrations[("vueda_vdq", name)]
    module = __import__(migration.__module__, fromlist=["changed_data"])
    references = list(workflow_references(module.changed_data))
    references.extend(change["changes"]["id"] for change in module.changed_data if change["model_name"] == "workflow")
    assert references
    for reference in references:
        assert reference == {
            "code": "queueitem",
            "historical_app_label": "vueda_vdq",
            "historical_model": "queueitem",
        }
