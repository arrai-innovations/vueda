"""AppConfig for the vueda.workflow.streams application."""

__all__ = ("WorkflowStreamsConfig",)

from django.apps import AppConfig


class WorkflowStreamsConfig(AppConfig):
    name = "vueda.workflow.streams"
    label = "vueda_workflow_streams"
    verbose_name = "VUEDA Workflow Streams"
