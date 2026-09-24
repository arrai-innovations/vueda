"""Django AppConfig for the vueda.core package."""

__all__ = ("CoreConfig",)

from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "vueda.core"
    label = "vueda_core"
    verbose_name = "VUEDA Core"

    def ready(self):
        from django.core.checks import Tags
        from django.core.checks import register

        from vueda.core.checks import check_exclude_fields_serializer_usage
        from vueda.core.checks import check_expandable_fields_configuration
        from vueda.core.checks import check_model_feature_policy
        from vueda.core.checks import check_session_cache_is_shared

        register(check_expandable_fields_configuration)
        register(check_exclude_fields_serializer_usage)
        register(check_model_feature_policy)
        # Deployment-only: a per-process cache is a correct choice for a one-process deployment,
        # so this reports through `check --deploy` rather than on every management command.
        register(check_session_cache_is_shared, Tags.caches, deploy=True)
