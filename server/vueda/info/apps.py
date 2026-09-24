"""AppConfig for the vueda.info application."""

__all__ = ("InfoConfig",)

from django.apps import AppConfig


def _has_formatted_name_field(cls):
    return getattr(cls, "formatted_name_lookup_expression", None) or callable(getattr(cls, "get_formatted_name", None))


def _get_formatted_name_via_lookup(self):
    from django.contrib.admin.utils import lookup_field

    formatted_name = getattr(self, "formatted_name", None)
    if formatted_name is None:
        _, _, formatted_name = lookup_field(self._meta.model.formatted_name_lookup_expression, self)
    return formatted_name or None


def _get_formatted_name_via_method(self):
    formatted_name = getattr(self, "formatted_name", None)
    if formatted_name is None:
        formatted_name = self.get_formatted_name()
    return formatted_name or None


class InfoConfig(AppConfig):
    name = "vueda.info"
    label = "vueda_info"
    verbose_name = "VUEDA Info"

    def ready(self):
        from django.contrib.auth.models import Group
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        from django.core.checks import register

        from vueda.info.checks import check_column_totals_configuration
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.checks import check_formatted_name_configuration
        from vueda.info.checks import check_ordering_configuration

        # Add a default ordering to content types, to remove a warning.
        ContentType._meta.ordering = ["app_label", "model"]
        register(check_formatted_name_configuration)
        register(check_ordering_configuration)
        register(check_column_totals_configuration)
        register(check_field_source_resolution)

        # Patch Django built-in models with formatted_name support so they integrate
        # correctly with Vueda's formatted_name system without changes to core code.
        for model in (Group, Permission):
            model.formatted_name_lookup_expression = "name"
            model._has_formatted_name_field = classmethod(_has_formatted_name_field)
            model._get_formatted_name = _get_formatted_name_via_lookup

        ContentType.get_formatted_name = lambda self: self.app_labeled_name
        ContentType._has_formatted_name_field = classmethod(_has_formatted_name_field)
        ContentType._get_formatted_name = _get_formatted_name_via_method
