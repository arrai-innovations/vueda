"""AppConfig for the vueda.workflow application."""

__all__ = ("WorkflowConfig",)

from django.apps import AppConfig


class WorkflowConfig(AppConfig):
    name = "vueda.workflow"
    label = "vueda_workflow"
    verbose_name = "VUEDA Workflow"
