"""Helpers for checking optional VUEDA Django apps."""

__all__ = (
    "history_is_installed",
    "is_installed",
    "vdq_is_installed",
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


def history_is_installed() -> bool:
    """Return whether the VUEDA history app is installed."""
    return is_installed("vueda.history")


def workflow_is_installed() -> bool:
    """Return whether the VUEDA workflow app is installed."""
    return is_installed("vueda.workflow")


def vdq_is_installed() -> bool:
    """Return whether the VUEDA Dispatch Queue app is installed."""
    return is_installed("vueda.vdq")
