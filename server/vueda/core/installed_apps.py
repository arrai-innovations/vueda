"""Helpers for checking optional VUEDA Django apps."""

__all__ = (
    "is_installed",
    "vdq_is_installed",
    "workflow_enabled",
    "workflow_is_installed",
)

from django.apps import apps
from django.conf import settings
from django.core.exceptions import AppRegistryNotReady


def is_installed(app_name: str) -> bool:
    """Return whether Django is configured to install ``app_name``."""
    try:
        return apps.is_installed(app_name)
    except AppRegistryNotReady:
        if not settings.configured:
            return False
        return any(entry == app_name or entry.startswith(f"{app_name}.") for entry in settings.INSTALLED_APPS)


def workflow_is_installed() -> bool:
    """Return whether the VUEDA workflow app is installed."""
    return is_installed("vueda.workflow")


def workflow_enabled(model) -> bool:
    """Return whether ``model`` participates in workflow through ``class Vueda.Workflow``.

    Accepts a model class or instance. Returns ``False`` when the workflow app is not installed, since
    the ``Workflow`` section is then unregistered, and for a model outside the VUEDA model family.
    A proxy answers for its concrete model.
    """
    from vueda.core.models import supports_vueda_feature_policy
    from vueda.core.options import get_vueda_options

    if not isinstance(model, type):
        model = type(model)
    if not supports_vueda_feature_policy(model):
        return False
    return get_vueda_options(model).is_enabled("Workflow")


def vdq_is_installed() -> bool:
    """Return whether the VUEDA Dispatch Queue app is installed."""
    return is_installed("vueda.vdq")
