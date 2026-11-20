"""Find the tools that the installed apps register for ``makevuedamigrations``."""

__all__ = (
    "TOOLS_ATTRIBUTE",
    "get_migration_tools",
)

from django.apps import apps as django_apps
from django.utils.module_loading import import_string


# The AppConfig attribute that lists an app's tools, as dotted paths to MigrationTool subclasses. It is private
# for now, so the interface can still change before a project relies on it.
TOOLS_ATTRIBUTE = "_vueda_migration_tools"


def get_migration_tools(command):
    """Return an instance of every tool that the installed apps register, in ``tie_order`` order.

    An app registers its tools in its AppConfig's ``_vueda_migration_tools`` attribute. A tool's module is
    imported only when its app is installed.
    """
    tools = []
    for app_config in django_apps.get_app_configs():
        for dotted_path in getattr(app_config, TOOLS_ATTRIBUTE, ()):
            tools.append(import_string(dotted_path)(command))

    return tuple(sorted(tools, key=lambda tool: tool.tie_order))
