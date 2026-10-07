"""
Reversing a workflow migration after another migration delays a model reload.

Some migration operations, such as ``AlterModelOptions`` and pgtrigger's ``AddTrigger``, reload a model
with ``delay=True``. That re-renders the model and its direct relations but not the models that point at
them, so a foreign key can keep an older class than ``apps.get_model()`` returns. Django re-renders the
registry before a forwards ``RunPython`` but not before a backwards one
(https://code.djangoproject.com/ticket/33586), so the reverse code VUEDA generates rebuilds it.

The workaround can go once the oldest Django version VUEDA supports includes the fix. The xfail test
reports the first Django version with the fix, and the removal check then reports when VUEDA's declared
Django requirement no longer allows a version without it.
"""

import importlib.metadata

import django
import pytest
from django.apps import apps as django_apps
from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.db import migrations
from django.db import models
from django.db.migrations.state import ModelState
from django.db.migrations.state import ProjectState
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from packaging.version import Version

from tests.store import models as store_models
from vueda.workflow.management.commands.makeworkflowmigrations import backwards_migrate_workflow
from vueda.workflow.models import Workflow


# The first Django version that fixes ticket #33586, such as (6, 2). Set it when the xfail test below
# passes unexpectedly on a new Django version.
DJANGO_33586_FIXED_IN = None


def oldest_supported_django():
    """Return the lower bound of the Django requirement that the installed vueda package declares."""
    for requirement_text in importlib.metadata.requires("vueda"):
        requirement = Requirement(requirement_text)
        if canonicalize_name(requirement.name) == "django":
            return min(Version(spec.version) for spec in requirement.specifier if spec.operator == ">=").release
    raise LookupError("The vueda package declares no Django requirement.")


def test_rebuild_migration_apps_is_still_needed():
    assert DJANGO_33586_FIXED_IN is None or oldest_supported_django() < DJANGO_33586_FIXED_IN, (
        "Every Django version VUEDA supports fixes ticket #33586. Remove rebuild_migration_apps from the "
        "workflow migration reverse code and the vueda_vdq workflow migrations, along with this file."
    )


@pytest.mark.django_db
class TestReverseWorkflowAfterDelayedReload:
    @pytest.mark.xfail(
        DJANGO_33586_FIXED_IN is None or django.VERSION < DJANGO_33586_FIXED_IN,
        strict=True,
        reason=(
            "Django ticket #33586: RunPython.database_backwards does not re-render a delayed registry "
            "(https://code.djangoproject.com/ticket/33586). When this passes unexpectedly on a new Django "
            "version, set DJANGO_33586_FIXED_IN to that version."
        ),
    )
    def test_django_gives_backwards_run_python_consistent_related_models(self):
        # A and C both point at Hub, and B points at A, so a delayed reload of C re-renders A but not B.
        state = ProjectState()
        state.add_model(ModelState("delayed_reload", "Hub", [("id", models.AutoField(primary_key=True))]))
        state.add_model(
            ModelState(
                "delayed_reload",
                "A",
                [
                    ("id", models.AutoField(primary_key=True)),
                    ("hub", models.ForeignKey("delayed_reload.Hub", models.CASCADE)),
                ],
            )
        )
        state.add_model(
            ModelState(
                "delayed_reload",
                "B",
                [
                    ("id", models.AutoField(primary_key=True)),
                    ("a", models.ForeignKey("delayed_reload.A", models.CASCADE)),
                ],
            )
        )
        state.add_model(
            ModelState(
                "delayed_reload",
                "C",
                [
                    ("id", models.AutoField(primary_key=True)),
                    ("hub", models.ForeignKey("delayed_reload.Hub", models.CASCADE)),
                ],
            )
        )
        # A delayed reload only leaves older classes behind in a registry that is already rendered.
        state.apps.get_models()
        state.reload_model("delayed_reload", "c", delay=True)
        related_models = []

        def record_related_models(apps, schema_editor):
            related_models.append(
                (
                    apps.get_model("delayed_reload", "B")._meta.get_field("a").related_model,
                    apps.get_model("delayed_reload", "A"),
                )
            )

        operation = migrations.RunPython(migrations.RunPython.noop, record_related_models)
        with connection.schema_editor() as schema_editor:
            operation.database_backwards("delayed_reload", schema_editor, state, state.clone())

        [(b_relation, a_model)] = related_models
        assert b_relation is a_model

    def test_reversing_a_workflow_migration_after_a_delayed_reload_removes_the_workflow(self):
        workflow = Workflow.objects.create(
            code="delayed_reload",
            name="Delayed Reload",
            content_type=ContentType.objects.get_for_model(store_models.Note),
        )
        # store.Note and Workflow both point at ContentType, and ObjectState points at Workflow, so a
        # delayed reload of Note re-renders Workflow but not ObjectState.
        state = ProjectState.from_apps(django_apps)
        state.apps.get_models()
        state.reload_model("store", "note", delay=True)
        stale_apps = state.apps
        assert stale_apps.get_model("vueda_workflow", "ObjectState")._meta.get_field(
            "workflow"
        ).related_model is not stale_apps.get_model("vueda_workflow", "Workflow"), (
            "The delayed reload no longer leaves ObjectState on an older Workflow class, so this test checks nothing."
        )

        backwards_migrate_workflow(
            stale_apps,
            [
                {
                    "changes": {"code": "delayed_reload", "id": {"code": "delayed_reload"}},
                    "history_type": "added",
                    "model_name": "workflow",
                }
            ],
            "reverse test migration",
        )

        assert not Workflow.objects.filter(pk=workflow.pk).exists()
