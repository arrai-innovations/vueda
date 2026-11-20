"""Workflow identities for the refresh, and the directories that count as installed packages.

The refresh adds the app and model to a workflow reference that names a code alone, from what each code meant
when the reference was recorded.
"""

import datetime
import os
import site
import sys
import sysconfig
from pathlib import Path

import pytest
from django.db.migrations.loader import MigrationLoader

from vueda.user.migration_generation import utils as migration_utils
from vueda.workflow.migration_generation import refresh as workflow_refresh


def workflow_change_recorded_on(day, history_type, code, historical_model):
    """Return a workflow's change to ``changed_data``, recorded on that day of January 2026."""
    return {
        "changes": {"code": code, "historical_app_label": "product", "historical_model": historical_model},
        "history_date": datetime.datetime(2026, 1, day, tzinfo=datetime.UTC),
        "history_type": history_type,
        "model_name": "workflow",
    }


FIRST_WORKFLOW = {"historical_app_label": "product", "historical_model": "first"}


@pytest.mark.parametrize(
    ("changed_data", "expected"),
    [
        # Recorded before the only workflow to hold the code, so it means that workflow.
        ([workflow_change_recorded_on(3, "added", "reused", "first")], FIRST_WORKFLOW),
        # The only workflow to hold the code changed after it was added, so it has two entries naming it.
        (
            [
                workflow_change_recorded_on(3, "added", "reused", "first"),
                workflow_change_recorded_on(4, "changed", "reused", "first"),
            ],
            FIRST_WORKFLOW,
        ),
        # The only workflow to hold the code changed its own model, so its two entries name different models.
        (
            [
                workflow_change_recorded_on(3, "added", "reused", "first"),
                workflow_change_recorded_on(4, "changed", "reused", ("first", "second")),
            ],
            FIRST_WORKFLOW,
        ),
        # The workflow was deleted and added again for the same model, so either one is the same answer.
        (
            [
                workflow_change_recorded_on(3, "added", "reused", "first"),
                workflow_change_recorded_on(4, "deleted", "reused", "first"),
                workflow_change_recorded_on(5, "added", "reused", "first"),
            ],
            FIRST_WORKFLOW,
        ),
        # A second workflow was added with the code, so which one the reference means cannot be told.
        (
            [
                workflow_change_recorded_on(3, "added", "reused", "first"),
                workflow_change_recorded_on(4, "added", "reused", "second"),
            ],
            None,
        ),
        # Another workflow's code was changed to this one, so which one the reference means cannot be told.
        (
            [
                workflow_change_recorded_on(3, "added", "reused", "first"),
                workflow_change_recorded_on(4, "changed", ("other", "reused"), "second"),
            ],
            None,
        ),
    ],
)
def test_workflow_identity_at_a_reference_recorded_before_every_workflow(changed_data, expected):
    identities = workflow_refresh.collect_workflow_identities([changed_data])

    identity = workflow_refresh.workflow_identity_at(
        identities, "reused", datetime.datetime(2026, 1, 2, tzinfo=datetime.UTC)
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
        migration_utils,
        "INSTALLED_PACKAGE_PATHS",
        (os.path.normcase(os.path.realpath(tmp_path / "site-packages")),),
    )

    assert migration_utils.is_installed_package_path(tmp_path / relative_path) is expected


def test_user_site_directory_counts_as_installed(tmp_path, monkeypatch):
    # `pip install --user` installs into the user site directory, which PYTHONUSERBASE moves. site works
    # it out once at startup, so clearing its cached values makes it work it out again from the variable.
    monkeypatch.setenv("PYTHONUSERBASE", str(tmp_path))
    monkeypatch.setattr(site, "USER_BASE", None)
    monkeypatch.setattr(site, "USER_SITE", None)
    user_site = Path(site.getusersitepackages())
    assert user_site.is_relative_to(tmp_path)
    monkeypatch.setattr(migration_utils, "INSTALLED_PACKAGE_PATHS", migration_utils.get_installed_package_paths())

    assert migration_utils.is_installed_package_path(user_site / "somepackage" / "migrations")
    assert not migration_utils.is_installed_package_path(tmp_path / "project" / "migrations")


def test_base_interpreter_packages_count_as_installed():
    # A virtual environment created with --system-site-packages also imports what the interpreter it was
    # created from has installed, which is where that interpreter's own pip installs.
    base_packages = sysconfig.get_path("purelib", vars={"base": sys.base_prefix, "platbase": sys.base_exec_prefix})

    assert migration_utils.is_installed_package_path(Path(base_packages) / "somepackage" / "migrations")


def test_base_interpreter_directory_itself_does_not_count_as_installed(monkeypatch):
    # On Windows, site.getsitepackages lists each prefix itself alongside its Lib\site-packages. A project kept
    # inside a Python install, such as a portable one, is under the prefix but not under its site-packages.
    monkeypatch.setattr(
        site,
        "getsitepackages",
        lambda prefixes: [
            path for prefix in prefixes for path in (prefix, os.path.join(prefix, "Lib", "site-packages"))
        ],
    )
    monkeypatch.setattr(migration_utils, "INSTALLED_PACKAGE_PATHS", migration_utils.get_installed_package_paths())
    base_prefix = Path(sys.base_prefix)

    assert migration_utils.is_installed_package_path(base_prefix / "Lib" / "site-packages" / "somepackage")
    assert not migration_utils.is_installed_package_path(base_prefix / "project" / "migrations")


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
