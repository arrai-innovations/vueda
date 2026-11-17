import os
import subprocess
import sys
import textwrap

import pytest


def run_optional_apps_probe(script, *, include_workflow=False, include_vdq=False):
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "tests.optional_apps_settings",
        "VUEDA_INCLUDE_WORKFLOW": "true" if include_workflow else "false",
        "VUEDA_INCLUDE_VDQ": "true" if include_vdq else "false",
    }

    return subprocess.run(
        [sys.executable, "-c", textwrap.dedent(script)],
        capture_output=True,
        check=False,
        env=env,
        text=True,
    )


def assert_probe_succeeded(result):
    assert result.returncode == 0, result.stderr


# Every configuration installs history, so the event models VUEDA ships are always part of the
# graph. Workflow is optional, and VDQ requires it.
SUPPORTED_APP_COMBINATIONS = (
    pytest.param({}, {"vueda_user", "vueda_release"}, id="history"),
    pytest.param({"include_workflow": True}, {"vueda_user", "vueda_release", "vueda_workflow"}, id="workflow"),
    pytest.param(
        {"include_workflow": True, "include_vdq": True},
        {"vueda_user", "vueda_release", "vueda_workflow", "vueda_vdq"},
        id="workflow-and-vdq",
    ),
)


@pytest.mark.parametrize(("apps_installed", "expected_labels"), SUPPORTED_APP_COMBINATIONS)
def test_every_supported_app_combination_loads_the_migration_graph(apps_installed, expected_labels):
    """A shipped migration may not describe a model that only some configurations build.

    An event model holds a ``pgh_context`` foreign key, so the migration that adds it depends on a
    ``pghistory`` node. Omitting an app whose migrations carry that dependency raises
    ``NodeNotFoundError`` while the graph loads, long before any check or test runs.
    """
    result = run_optional_apps_probe(
        """
        import io

        import django

        django.setup()

        from django.core.management import call_command
        from django.db import connection
        from django.db.migrations.loader import MigrationLoader

        loader = MigrationLoader(connection)
        loaded = {app_label for app_label, _ in loader.graph.nodes}
        expected = set(EXPECTED_LABELS) | {"pghistory"}
        assert expected <= loaded, sorted(expected - loaded)

        output = io.StringIO()
        pending = False
        try:
            call_command("makemigrations", "--check", "--dry-run", stdout=output)
        except SystemExit:
            pending = True
        assert not pending, output.getvalue()
        """.replace("EXPECTED_LABELS", repr(sorted(expected_labels))),
        **apps_installed,
    )

    assert_probe_succeeded(result)


def test_django_starts_without_workflow_or_vdq():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        from django.core.checks import run_checks
        from django.urls import get_resolver
        from vueda.info.registration import get_all_registrations

        messages = run_checks()
        assert messages == [], [(message.id, message.msg) for message in messages]
        get_resolver().url_patterns

        assert "optional_apps.ticket" in get_all_registrations()
        assert "vueda.workflow.models" not in sys.modules
        assert "vueda.vdq.models" not in sys.modules
        """
    )

    assert_probe_succeeded(result)


def test_the_history_backend_is_configured():
    result = run_optional_apps_probe(
        """
        import django

        django.setup()

        from django.apps import apps
        from django.conf import settings

        assert apps.is_installed("pghistory")
        assert apps.is_installed("pgtrigger")
        assert settings.PGHISTORY_APPEND_ONLY is True
        assert "vueda.history.middleware.VuedaHistoryMiddleware" in settings.MIDDLEWARE

        tracked = [model for model in apps.get_models() if getattr(model, "pgh_tracked_model", None) is not None]
        assert tracked, "the history app installs no event models"
        """
    )

    assert_probe_succeeded(result)


def test_history_queries_load_without_workflow_and_find_no_state_events():
    """History owns the registration point, so it builds its queries without importing workflow."""
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        import vueda.history.queries
        from vueda.history.sources import state_events_for

        assert state_events_for(object()) == ()
        assert "vueda.workflow.models" not in sys.modules
        """
    )

    assert_probe_succeeded(result)


def test_stale_optional_url_includes_are_empty_when_apps_are_absent():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        import vueda.history.urls
        import vueda.vdq.urls
        import vueda.workflow.urls

        assert vueda.history.urls.urlpatterns == []
        assert vueda.workflow.urls.urlpatterns == []
        assert vueda.vdq.urls.urlpatterns == []
        assert "vueda.workflow.models" not in sys.modules
        assert "vueda.vdq.models" not in sys.modules
        """
    )

    assert_probe_succeeded(result)


def test_model_info_data_does_not_import_workflow_when_workflow_is_absent():
    result = run_optional_apps_probe(
        """
        from types import SimpleNamespace
        import sys

        import django

        django.setup()

        from tests.optional_apps.models import Ticket
        from tests.optional_apps.serializers import TicketSerializer
        from tests.optional_apps.viewsets import TicketViewSet
        from vueda.info.serializers import ModelInfoSerializer

        content_type = SimpleNamespace(
            pk=1,
            id=1,
            app_label="optional_apps",
            model="ticket",
            model_class=lambda: Ticket,
        )
        serializer = ModelInfoSerializer(instance=content_type)
        serializer.__dict__["canonical"] = {
            "serializer": TicketSerializer,
            "viewset": TicketViewSet,
        }

        data = serializer.data

        assert data["app_label"] == "optional_apps"
        assert data["model"] == "ticket"
        assert "vueda.workflow.models" not in sys.modules
        """
    )

    assert_probe_succeeded(result)


def test_open_api_import_does_not_import_workflow_when_workflow_is_absent():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        from vueda.core import open_api

        assert open_api.OpenApiDocsGenerationObjectIdModel is not None
        assert "vueda.workflow.models" not in sys.modules
        """
    )

    assert_probe_succeeded(result)


def test_schema_generation_omits_workflow_when_workflow_is_absent():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        from drf_spectacular.generators import SchemaGenerator

        schema = SchemaGenerator().get_schema(request=None, public=True)

        assert all(not path.startswith("/routes/vueda.workflow/") for path in schema["paths"])
        assert {tag["name"] for tag in schema["tags"]} == {"vueda.info", "vueda.user"}
        assert "vueda.workflow.models" not in sys.modules
        """
    )

    assert_probe_succeeded(result)


def test_vdq_requires_workflow():
    result = run_optional_apps_probe(
        """
        import django
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured

        settings.INSTALLED_APPS = [*settings.INSTALLED_APPS, "vueda.vdq"]

        try:
            django.setup()
        except ImproperlyConfigured as exc:
            assert str(exc) == "'vueda.vdq' requires 'vueda.workflow' in INSTALLED_APPS."
        else:
            raise AssertionError("Expected vueda.vdq to require vueda.workflow.")
        """
    )

    assert_probe_succeeded(result)


def test_the_history_api_is_part_of_the_core_viewset():
    result = run_optional_apps_probe(
        """
        import django

        django.setup()

        from vueda.core.viewsets import VuedaViewSet

        assert "history_list" in {action.__name__ for action in VuedaViewSet.get_extra_actions()}
        """
    )

    assert_probe_succeeded(result)


def test_makevuedamigrations_writes_group_migrations_without_workflow():
    """Without vueda.workflow, the command registers only the group tool and never imports workflow code.

    SQLite cannot run VUEDA's own migrations, so this database has no GroupChange table. The group tool's one
    database read is replaced with a recorded change. Everything after it runs for real: the command, the
    planner, the writer, and makemigrations.
    """
    result = run_optional_apps_probe(
        """
        import datetime
        import io
        import sys
        import tempfile
        from pathlib import Path

        import django

        django.setup()

        from django.conf import settings
        from django.core.management import call_command

        from vueda.user.management.commands.makevuedamigrations import Command
        from vueda.user.migration_generation.groups import GroupChangeTool
        from vueda.user.migration_generation.tools import PendingChange
        from vueda.user.migration_generation.tools import get_migration_tools

        # The user app gets a migrations package, with the initial migration that a project would have.
        root = Path(tempfile.mkdtemp())
        migrations_dir = root / "generated_user_app" / "migrations"
        migrations_dir.mkdir(parents=True)
        (root / "generated_user_app" / "__init__.py").write_text("")
        (migrations_dir / "__init__.py").write_text("")
        sys.path.insert(0, str(root))
        settings.MIGRATION_MODULES = {"optional_apps": "generated_user_app.migrations"}
        call_command("makemigrations", "optional_apps", verbosity=0)

        recorded_at = datetime.datetime(2026, 11, 13, 9, 0, tzinfo=datetime.UTC)
        change = {
            "group_name": "Ticket Readers",
            "group_name_old": "",
            "change_type": "added",
            "when": recorded_at,
            "historical_permission_codename": "read_ticket",
            "historical_permission_content_type_app_label": "optional_apps",
            "historical_permission_content_type_model_name": "ticket",
            "historical_permission_name": "Can read ticket",
        }
        GroupChangeTool.pending_changes = lambda self: (
            PendingChange(recorded_at=recorded_at, tiebreak=(1,), app_label="optional_apps", data=change),
        )

        assert [tool.key for tool in get_migration_tools(None)] == ["group"]
        # This process does not run the conftest fixture that sets this for the test suite.
        Command._import_instead = True
        call_command("makevuedamigrations", stdout=io.StringIO())

        names = sorted(path.name for path in migrations_dir.glob("0*.py"))
        assert names == ["0001_initial.py", "0002_group_permission_migrations.py"], names
        source = (migrations_dir / "0002_group_permission_migrations.py").read_text()
        assert "makevuedamigrations command (group changes)" in source
        assert "Ticket Readers" in source
        assert "vueda_workflow" not in source
        assert "__first__" not in source
        assert not [name for name in sys.modules if name.startswith("vueda.workflow")]
        """
    )

    assert_probe_succeeded(result)
