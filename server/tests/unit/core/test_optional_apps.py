import os
import subprocess
import sys
import textwrap


def run_optional_apps_probe(script, *, include_history=True):
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "tests.optional_apps_settings",
        "VUEDA_INCLUDE_HISTORY": "true" if include_history else "false",
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


def test_django_starts_without_workflow_or_vdq_with_history_installed():
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


def test_django_starts_without_history_workflow_or_vdq():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        from django.core.checks import run_checks
        from django.urls import get_resolver

        messages = run_checks()
        assert messages == [], [(message.id, message.msg) for message in messages]
        get_resolver().url_patterns

        assert "vueda.history.views" not in sys.modules
        assert "vueda.workflow.models" not in sys.modules
        assert "vueda.vdq.models" not in sys.modules
        """,
        include_history=False,
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
        assert "vueda.history.views" not in sys.modules
        assert "vueda.workflow.models" not in sys.modules
        assert "vueda.vdq.models" not in sys.modules
        """,
        include_history=False,
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
