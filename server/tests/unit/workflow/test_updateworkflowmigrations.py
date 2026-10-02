import datetime
import importlib.util
import io
import os
import shutil
import site
import sys
import sysconfig
from pathlib import Path
from pprint import pformat

import pytest
from django.core.management import call_command
from django.db.migrations.loader import MigrationLoader

from tests.utils import BaseTestMigrations
from vueda import workflow as workflow_module
from vueda.workflow.management.commands import updateworkflowmigrations


WORKFLOW_EVENTS = "0008_initialstateevent_objectstateevent_stateevent_and_more"
VDQ_WORKFLOW = "0005_workflow_migrations_2025_11_21"
PRODUCT_LATEST = "0004_productcascadeorderedbyformattedname_and_more"

# The directory holding both `vueda/` and `tests/`, whose apps carry workflow migrations of their own.
SOURCE_TREE = Path(workflow_module.__file__).parents[2]


def read_migration(path):
    spec = importlib.util.spec_from_file_location("migration_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_workflow_migration(path, dependencies, *, import_instead=False, changed_data=()):
    imports = ""
    if import_instead:
        imports = "from vueda.workflow.management.commands.makeworkflowmigrations import forwards_migrate_workflow\n"
    path.write_text(
        "# Modified using VUEDA makeworkflowmigrations command.  Please do not delete this comment.\n"
        "import datetime\n"
        "from django.db import migrations\n"
        f"{imports}\n"
        'history_change_reason = "Test workflow migration"\n'
        'migration_app_label = "vueda_vdq"\n'
        f"changed_data = {pformat(list(changed_data))}\n\n"
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


class TestInstalledPackageApps(BaseTestMigrations):
    """Apps installed as packages are read, but never rewritten.

    Each test also counts the source tree as installed, so that a run with no app label rewrites only
    the temporary copies and never the test apps' own migrations.
    """

    @pytest.mark.parametrize("dry_run", [False, True])
    def test_no_label_leaves_an_installed_package_app_unchanged(self, settings, monkeypatch, dry_run):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            monkeypatch.setattr(
                updateworkflowmigrations,
                "INSTALLED_PACKAGE_PATHS",
                (
                    *updateworkflowmigrations.INSTALLED_PACKAGE_PATHS,
                    *(os.path.normcase(os.path.realpath(path)) for path in (SOURCE_TREE, directory)),
                ),
            )
            # Compatible, so only being in a package keeps it from being rewritten.
            write_workflow_migration(
                Path(directory) / "0006_workflow_probe.py",
                [("vueda_vdq", VDQ_WORKFLOW), ("vueda_workflow", WORKFLOW_EVENTS)],
            )
            originals = {path: path.read_bytes() for path in Path(directory).glob("*.py")}
            output, errors = io.StringIO(), io.StringIO()

            call_command("updateworkflowmigrations", dry_run=dry_run, stdout=output, stderr=errors)

            assert {path: path.read_bytes() for path in originals} == originals
            assert directory not in output.getvalue()
            assert "No workflow migrations found to update." in output.getvalue()
            assert errors.getvalue() == ""

    @pytest.mark.parametrize("dry_run", [False, True])
    def test_named_installed_package_app_is_rejected(self, settings, monkeypatch, dry_run):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            monkeypatch.setattr(
                updateworkflowmigrations,
                "INSTALLED_PACKAGE_PATHS",
                (
                    *updateworkflowmigrations.INSTALLED_PACKAGE_PATHS,
                    *(os.path.normcase(os.path.realpath(path)) for path in (SOURCE_TREE, directory)),
                ),
            )
            write_workflow_migration(
                Path(directory) / "0006_workflow_probe.py",
                [("vueda_vdq", VDQ_WORKFLOW), ("vueda_workflow", WORKFLOW_EVENTS)],
            )
            originals = {path: path.read_bytes() for path in Path(directory).glob("*.py")}
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", "vueda_vdq", dry_run=dry_run, stdout=output, stderr=errors)

            assert failure.value.code == 2  # noqa: PLR2004
            assert {path: path.read_bytes() for path in originals} == originals
            assert (
                f"App 'vueda_vdq' is part of an installed package at {directory}. "
                "updateworkflowmigrations will not update installed packages."
            ) in errors.getvalue()
            assert output.getvalue() == ""

    def test_no_label_updates_an_app_outside_installed_packages(self, settings, monkeypatch):
        with self.temporary_migration_module(settings, app_label="vueda_vdq") as directory:
            monkeypatch.setattr(
                updateworkflowmigrations,
                "INSTALLED_PACKAGE_PATHS",
                (*updateworkflowmigrations.INSTALLED_PACKAGE_PATHS, os.path.normcase(os.path.realpath(SOURCE_TREE))),
            )
            path = Path(directory) / "0006_workflow_probe.py"
            write_workflow_migration(path, [("vueda_vdq", VDQ_WORKFLOW), ("vueda_workflow", WORKFLOW_EVENTS)])
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", stdout=output, stderr=errors)

            assert failure.value.code == 1  # The two original vdq migrations cannot be rewritten.
            assert "Updated 1 workflow migration(s)." in output.getvalue()
            assert "Failed updating 2 workflow migration(s)." in output.getvalue()
            assert b"old migration body" not in path.read_bytes()

    @pytest.mark.parametrize("app_labels", [(), ("product",)])
    def test_reference_names_the_workflow_an_installed_package_recorded(self, settings, monkeypatch, app_labels):
        """A project reference names the workflow that held its code when it was recorded.

        Only the package's migrations record that workflow. The project later creates another workflow
        with the same code, after the package renamed its own.
        """
        with (
            self.temporary_migration_module(settings, app_label="vueda_vdq") as package_directory,
            self.temporary_migration_module(settings, app_label="product") as project_directory,
        ):
            monkeypatch.setattr(
                updateworkflowmigrations,
                "INSTALLED_PACKAGE_PATHS",
                (
                    *updateworkflowmigrations.INSTALLED_PACKAGE_PATHS,
                    *(os.path.normcase(os.path.realpath(path)) for path in (SOURCE_TREE, package_directory)),
                ),
            )
            package_directory, project_directory = Path(package_directory), Path(project_directory)
            package_workflow = {"code": "reused", "historical_app_label": "product", "historical_model": "product"}

            # 1. The package creates workflow `reused` for product.product.
            write_workflow_migration(
                package_directory / "0008_workflow_created.py",
                [("vueda_vdq", VDQ_WORKFLOW), ("vueda_workflow", WORKFLOW_EVENTS)],
                changed_data=[
                    {
                        "changes": {**package_workflow, "id": package_workflow, "name": "Reused"},
                        "history_date": datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC),
                        "history_type": "added",
                        "model_name": "workflow",
                    }
                ],
            )
            # 2. The project records a state whose workflow reference names the code alone.
            state_path = project_directory / "0005_workflow_state.py"
            write_workflow_migration(
                state_path,
                [("product", PRODUCT_LATEST), ("vueda_vdq", "0008_workflow_created")],
                changed_data=[
                    {
                        "changes": {
                            "code": "pending",
                            "id": {"code": "pending", "workflow_id": {"code": "reused"}},
                            "name": "Pending",
                            "workflow_id": {"code": "reused"},
                        },
                        "history_date": datetime.datetime(2026, 1, 2, tzinfo=datetime.UTC),
                        "history_type": "added",
                        "model_name": "state",
                    }
                ],
            )
            # 3. The package renames its workflow code to `retired`.
            write_workflow_migration(
                package_directory / "0009_workflow_renamed.py",
                [("vueda_vdq", "0008_workflow_created"), ("product", "0005_workflow_state")],
                changed_data=[
                    {
                        "changes": {
                            "code": ("reused", "retired"),
                            "historical_app_label": "product",
                            "historical_model": "product",
                            "id": {
                                "code": ("reused", "retired"),
                                "historical_app_label": "product",
                                "historical_model": "product",
                            },
                            "name": "Reused",
                        },
                        "history_date": datetime.datetime(2026, 1, 3, tzinfo=datetime.UTC),
                        "history_type": "changed",
                        "model_name": "workflow",
                    }
                ],
            )
            # 4. The project creates workflow `reused` for vueda_vdq.job.
            write_workflow_migration(
                project_directory / "0006_workflow_reused.py",
                [("product", "0005_workflow_state"), ("vueda_vdq", "0009_workflow_renamed")],
                changed_data=[
                    {
                        "changes": {
                            "code": "reused",
                            "historical_app_label": "vueda_vdq",
                            "historical_model": "job",
                            "id": {"code": "reused"},
                            "name": "Reused",
                        },
                        "history_date": datetime.datetime(2026, 1, 4, tzinfo=datetime.UTC),
                        "history_type": "added",
                        "model_name": "workflow",
                    }
                ],
            )
            package_originals = {path: path.read_bytes() for path in package_directory.glob("*.py")}
            output, errors = io.StringIO(), io.StringIO()

            call_command("updateworkflowmigrations", *app_labels, stdout=output, stderr=errors)

            assert {path: path.read_bytes() for path in package_originals} == package_originals
            assert "Updated 2 workflow migration(s)." in output.getvalue()
            assert errors.getvalue() == ""
            state_changes = read_migration(state_path).changed_data[0]["changes"]
            assert state_changes["workflow_id"] == package_workflow
            assert state_changes["id"]["workflow_id"] == package_workflow

    @pytest.mark.parametrize("dry_run", [False, True])
    def test_dependency_check_imports_installed_package_migrations(self, settings, monkeypatch, dry_run):
        """Checking a project migration's dependencies loads the whole graph, package migrations included."""
        with (
            self.temporary_migration_module(settings, app_label="vueda_vdq") as package_directory,
            self.temporary_migration_module(settings, app_label="product") as project_directory,
        ):
            monkeypatch.setattr(
                updateworkflowmigrations,
                "INSTALLED_PACKAGE_PATHS",
                (
                    *updateworkflowmigrations.INSTALLED_PACKAGE_PATHS,
                    *(os.path.normcase(os.path.realpath(path)) for path in (SOURCE_TREE, package_directory)),
                ),
            )
            # Not a workflow migration, so only the dependency check imports it.
            (Path(package_directory) / "0008_raises_on_import.py").write_text(
                'raise RuntimeError("package migration imported")\n'
            )
            path = Path(project_directory) / "0005_workflow_probe.py"
            write_workflow_migration(path, [("product", PRODUCT_LATEST), ("vueda_workflow", WORKFLOW_EVENTS)])
            originals = {
                item: item.read_bytes()
                for directory in (package_directory, project_directory)
                for item in Path(directory).glob("*.py")
            }
            output, errors = io.StringIO(), io.StringIO()

            with pytest.raises(SystemExit) as failure:
                call_command("updateworkflowmigrations", dry_run=dry_run, stdout=output, stderr=errors)

            assert failure.value.code == 1
            assert f"Cannot resolve migration dependencies for {path}: package migration imported, skipping." in (
                errors.getvalue()
            )
            assert ("Would have failed updating" if dry_run else "Failed updating") + " 1 workflow migration(s)." in (
                output.getvalue()
            )
            assert {item: item.read_bytes() for item in originals} == originals


@pytest.mark.parametrize(
    ("entries", "expected"),
    [
        # Recorded before the only workflow to hold the code, so it means that workflow.
        (
            [(datetime.datetime(2026, 1, 3, tzinfo=datetime.UTC), {"historical_model": "first"})],
            {"historical_model": "first"},
        ),
        # The only workflow to hold the code changed after it was added, so it has two entries naming it.
        (
            [
                (datetime.datetime(2026, 1, 3, tzinfo=datetime.UTC), {"historical_model": "first"}),
                (datetime.datetime(2026, 1, 4, tzinfo=datetime.UTC), {"historical_model": "first"}),
            ],
            {"historical_model": "first"},
        ),
        # Recorded before every workflow to hold the code, so which one it means cannot be told.
        (
            [
                (datetime.datetime(2026, 1, 3, tzinfo=datetime.UTC), {"historical_model": "first"}),
                (datetime.datetime(2026, 1, 4, tzinfo=datetime.UTC), {"historical_model": "second"}),
            ],
            None,
        ),
    ],
)
def test_workflow_identity_at_a_reference_recorded_before_every_workflow(entries, expected):
    identity = updateworkflowmigrations.workflow_identity_at(
        {"reused": entries}, "reused", datetime.datetime(2026, 1, 2, tzinfo=datetime.UTC)
    )

    assert identity == expected


@pytest.mark.parametrize(
    ("relative_path", "expected"),
    [
        ("site-packages", True),
        ("site-packages/somepackage/migrations", True),
        ("site-packages-old/somepackage/migrations", False),
        ("project/somepackage/migrations", False),
    ],
)
def test_is_installed_package_path(tmp_path, monkeypatch, relative_path, expected):
    monkeypatch.setattr(
        updateworkflowmigrations,
        "INSTALLED_PACKAGE_PATHS",
        (os.path.normcase(os.path.realpath(tmp_path / "site-packages")),),
    )

    assert updateworkflowmigrations.is_installed_package_path(tmp_path / relative_path) is expected


def test_user_site_directory_counts_as_installed(tmp_path, monkeypatch):
    # `pip install --user` installs into the user site directory, which PYTHONUSERBASE moves. site works
    # it out once at startup, so clearing its cached values makes it work it out again from the variable.
    monkeypatch.setenv("PYTHONUSERBASE", str(tmp_path))
    monkeypatch.setattr(site, "USER_BASE", None)
    monkeypatch.setattr(site, "USER_SITE", None)
    user_site = Path(site.getusersitepackages())
    assert user_site.is_relative_to(tmp_path)
    monkeypatch.setattr(
        updateworkflowmigrations, "INSTALLED_PACKAGE_PATHS", updateworkflowmigrations.get_installed_package_paths()
    )

    assert updateworkflowmigrations.is_installed_package_path(user_site / "somepackage" / "migrations")
    assert not updateworkflowmigrations.is_installed_package_path(tmp_path / "project" / "migrations")


def test_base_interpreter_packages_count_as_installed():
    # A virtual environment created with --system-site-packages also imports what the interpreter it was
    # created from has installed, which is where that interpreter's own pip installs.
    base_packages = sysconfig.get_path("purelib", vars={"base": sys.base_prefix, "platbase": sys.base_exec_prefix})

    assert updateworkflowmigrations.is_installed_package_path(Path(base_packages) / "somepackage" / "migrations")


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
