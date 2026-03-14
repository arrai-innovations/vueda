"""AppConfig for the vueda.info application."""

__all__ = ("InfoConfig",)

from django.apps import AppConfig


class InfoConfig(AppConfig):
    name = "vueda.info"
    label = "vueda_info"
    verbose_name = "VUEDA Info"

    def ready(self):
        # Add a default ordering to content types, to remove a warning.
        from django.contrib.contenttypes.models import ContentType

        ContentType._meta.ordering = ["app_label", "model"]
