"""System checks for the workflow definitions and object states that workflow-enabled models require."""

__all__ = ("check_workflow_definitions",)

from django.apps import apps
from django.core.checks import Warning as CheckWarning
from django.db import connections
from django.db import router

from vueda.core.installed_apps import workflow_enabled


def check_workflow_definitions(app_configs=None, databases=None, **kwargs):
    """Report a workflow-enabled model whose definition or object states are missing.

    ``vueda_workflow.W001`` names a model with no ``Workflow`` definition. ``vueda_workflow.W002``
    names a model with objects that have no ``ObjectState`` row, which is what objects created by the
    previous release during a deploy look like until ``backfillworkflowstates`` runs.

    Registered with the ``database`` tag, so it runs only when a command names databases, which
    ``migrate`` does. Both are warnings rather than errors for that reason: an error would stop the
    very migration that creates the missing definition and object states.
    """
    from vueda.workflow.models import ObjectState
    from vueda.workflow.models import Workflow
    from vueda.workflow.models import objects_without_object_state

    if not databases:
        return []

    models = [
        model
        for model in (apps.get_models() if app_configs is None else _models_of(app_configs))
        if workflow_enabled(model) and not model._meta.proxy
    ]
    if not models:
        return []

    alias = router.db_for_read(Workflow)
    tables = connections[alias].introspection.table_names() if alias in databases else []
    if Workflow._meta.db_table not in tables or ObjectState._meta.db_table not in tables:
        # Before workflow's own migrations run there is nothing to read, and nothing to report yet.
        return []

    # Keyed by label, because resolving each model's content type would create any that are missing.
    workflows = {
        (workflow.content_type.app_label, workflow.content_type.model): workflow
        for workflow in Workflow.objects.using(alias).select_related("content_type")
    }
    warnings = []
    for model in models:
        workflow = workflows.get((model._meta.app_label, model._meta.model_name))
        if workflow is None:
            warnings.append(
                CheckWarning(
                    f"{model._meta.label} enables class Vueda.Workflow but has no workflow definition.",
                    hint=(
                        "Apply the migration that creates its workflow before serving workflow traffic, or "
                        "set enabled = False until the definition exists. Until then, requests that reach "
                        "this model fail with WorkflowNotConfiguredError."
                    ),
                    obj=model,
                    id="vueda_workflow.W001",
                )
            )
        elif model._meta.db_table in tables and objects_without_object_state(model, workflow).using(alias).exists():
            warnings.append(
                CheckWarning(
                    f"{model._meta.label} has objects without a workflow state.",
                    hint=(
                        f"Run 'manage.py backfillworkflowstates {model._meta.label}' to give them the initial "
                        "state. Until then they have no state, so state filters and state grants leave them "
                        "out and their transitions fail."
                    ),
                    obj=model,
                    id="vueda_workflow.W002",
                )
            )
    return warnings


def _models_of(app_configs):
    return [model for app_config in app_configs for model in app_config.get_models()]
