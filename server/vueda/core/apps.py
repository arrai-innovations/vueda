"""Django AppConfig for the vueda.core package."""

__all__ = ("CoreConfig",)

from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "vueda.core"
    label = "vueda_core"
    verbose_name = "VUEDA Core"

    def ready(self):
        from django.core.checks import register

        from .checks import check_exclude_fields_serializer_usage
        from .checks import check_expandable_fields_configuration
        from .checks import check_model_feature_policy

        register(check_expandable_fields_configuration)
        register(check_exclude_fields_serializer_usage)
        register(check_model_feature_policy)
