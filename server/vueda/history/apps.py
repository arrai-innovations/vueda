"""AppConfig for the vueda.history application."""

__all__ = ("HistoryConfig",)

from django.apps import AppConfig


class HistoryConfig(AppConfig):
    name = "vueda.history"
    label = "vueda_history"
    verbose_name = "VUEDA History"
