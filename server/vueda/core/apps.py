from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "vueda.core"
    verbose_name = "VUEDA Core"

    def ready(self):
        from vueda.core import rest_framework_smart_repr_patch  # noqa: F401
