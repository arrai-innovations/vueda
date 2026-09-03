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


def test_stale_optional_url_includes_are_empty_when_apps_are_absent():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        import vueda.history.urls
        import vueda.vdq.urls
        import vueda.workflow.urls

        assert vueda.history.urls.urlpatterns
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

        from vueda.core.serializers import VuedaSerializer
        from vueda.core.viewsets import VuedaViewSet
        from vueda.history.serializers import VuedaHistorySerializer

        assert issubclass(VuedaHistorySerializer, VuedaSerializer)
        assert "history_list" in {action.__name__ for action in VuedaViewSet.get_extra_actions()}
        """
    )

    assert_probe_succeeded(result)
