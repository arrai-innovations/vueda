"""Django AppConfig for the vueda.core package."""

__all__ = ("CoreConfig",)

from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "vueda.core"
    label = "vueda_core"
    verbose_name = "VUEDA Core"
