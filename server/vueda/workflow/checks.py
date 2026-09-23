"""System checks for workflow definitions that workflow-enabled models require."""

__all__ = ("check_workflow_definitions",)

from django.apps import apps
from django.core.checks import Warning as CheckWarning
from django.db import connections
from django.db import router

from vueda.core.installed_apps import workflow_enabled


def check_workflow_definitions(app_configs=None, databases=None, **kwargs):
    """Report a model that enables ``class Vueda.Workflow`` but has no ``Workflow`` definition.

    Registered with the ``database`` tag, so it runs only when a command names databases, which
    ``migrate`` does. It is a warning rather than an error for that reason: an error would stop the
    very migration that creates the missing definition. A request that reaches such a model raises
    ``WorkflowNotConfiguredError`` instead.
    """
    from vueda.workflow.models import Workflow

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
    if alias not in databases or Workflow._meta.db_table not in connections[alias].introspection.table_names():
        # Before workflow's own migrations run there is nothing to read, and nothing to report yet.
        return []

    # Compared by label, because resolving each model's content type would create any that are missing.
    configured = set(Workflow.objects.using(alias).values_list("content_type__app_label", "content_type__model"))
    return [
        CheckWarning(
            f"{model._meta.label} enables class Vueda.Workflow but has no workflow definition.",
            hint=(
                "Apply the migration that creates its workflow before serving workflow traffic, or set "
                "enabled = False until the definition exists. Until then, requests that reach this model "
                "fail with WorkflowNotConfiguredError."
            ),
            obj=model,
            id="vueda_workflow.W001",
        )
        for model in models
        if (model._meta.app_label, model._meta.model_name) not in configured
    ]


def _models_of(app_configs):
    return [model for app_config in app_configs for model in app_config.get_models()]
