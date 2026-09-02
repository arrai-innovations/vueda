import os
import subprocess
import sys
import textwrap


def run_optional_apps_probe(script, *, include_history=True, include_workflow=False):
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "tests.optional_apps_settings",
        "VUEDA_INCLUDE_HISTORY": "true" if include_history else "false",
        "VUEDA_INCLUDE_WORKFLOW": "true" if include_workflow else "false",
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


# Naming one module lets a new import into another one pass unnoticed, so assert on the package.
ASSERT_NO_HISTORY_IMPORTS = """
        imported = sorted(name for name in sys.modules if name.split(".")[:2] == ["vueda", "history"])
        assert imported == [], imported
"""


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


def test_no_history_backend_without_the_history_app():
    """The pghistory backend exists only where the optional feature app does."""
    result = run_optional_apps_probe(
        """
        import django

        django.setup()

        from django.apps import apps
        from django.conf import settings

        assert not apps.is_installed("pghistory"), settings.INSTALLED_APPS
        assert not apps.is_installed("pgtrigger"), settings.INSTALLED_APPS
        assert not hasattr(settings, "PGHISTORY_APPEND_ONLY")
        assert not [entry for entry in settings.MIDDLEWARE if "pghistory" in entry or "vueda.history" in entry]

        tracked = [model for model in apps.get_models() if getattr(model, "pgh_tracked_model", None) is not None]
        assert tracked == [], [model._meta.label for model in tracked]
        """,
        include_history=False,
    )

    assert_probe_succeeded(result)


def test_the_history_backend_is_configured_with_the_history_app():
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

        assert "vueda.workflow.models" not in sys.modules
        assert "vueda.vdq.models" not in sys.modules
        """
        + ASSERT_NO_HISTORY_IMPORTS,
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


def test_core_api_classes_load_without_history():
    result = run_optional_apps_probe(
        """
        import sys

        import django

        django.setup()

        from vueda.core.serializers import VuedaSerializer
        from vueda.core.viewsets import VuedaViewSet
        from vueda.info.serializers import ModelInfoSerializer

        assert issubclass(VuedaSerializer, object)
        assert issubclass(VuedaViewSet, object)
        assert ModelInfoSerializer is not None
        """
        + ASSERT_NO_HISTORY_IMPORTS,
        include_history=False,
    )

    assert_probe_succeeded(result)


def test_workflow_starts_without_history():
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

        from vueda.workflow.models import ObjectState
        from vueda.workflow.models import Workflow

        # Workflow tracks its own history through simple-history whether or not the app is present,
        # and the generated models stay in vueda_workflow so its migrations still apply.
        for model in (Workflow, ObjectState):
            assert model.history.model._meta.app_label == "vueda_workflow"
        """
        + ASSERT_NO_HISTORY_IMPORTS,
        include_history=False,
        include_workflow=True,
    )

    assert_probe_succeeded(result)


def test_history_classes_stay_available_when_history_is_installed():
    result = run_optional_apps_probe(
        """
        import django

        django.setup()

        from vueda.core.serializers import VuedaSerializer
        from vueda.core.viewsets import VuedaViewSet
        from vueda.history.serializers import VuedaHistorySerializer
        from vueda.history.viewsets import VuedaHistoryViewSet

        assert issubclass(VuedaHistorySerializer, VuedaSerializer)
        assert issubclass(VuedaHistoryViewSet, VuedaViewSet)
        """
    )

    assert_probe_succeeded(result)
